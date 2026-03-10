import { launch } from 'cloakbrowser';
import type { Browser } from 'playwright-core';
import { randomUUID } from 'crypto';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { SendMessageCommand } from '@aws-sdk/client-sqs';
import { bootstrapDatabaseUrl } from '@fca/db';
import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient | undefined;

import type { JobInput, ExtractedData } from './types.js';
import {
  CAMPAIGN_DATA_BUCKET,
  DEEP_SCRAPE_QUEUE_URL,
  TASK_MEMORY_MIB,
  TASK_CPU_UNITS,
  LIMITS,
  calculateOptimalConcurrency,
  s3Client,
  sqsClient,
} from './config.js';
import {
  scrapeWebsite,
  PagePool,
  DomainTracker,
  FailureTracker,
  ScrapeWebsiteExtendedResult,
  normalizeUrl,
  needsPlaywright,
} from './scraper/index.js';
import { extractAllData } from './extractors/index.js';
import { convertAndUploadMarkdown } from './markdown.js';
import {
  updateLeadWithScrapeData,
  markLeadScrapeFailed,
  updateFargateTask,
} from './storage/postgres.js';
import type { BatchLead } from './storage/postgres.js';

// ============ Social Media Detection ============

const SOCIAL_MEDIA_DOMAINS: Record<string, keyof ExtractedData['social']> = {
  'instagram.com': 'instagram',
  'facebook.com': 'facebook',
  'linkedin.com': 'linkedin',
  'twitter.com': 'twitter',
  'x.com': 'twitter',
};

const SOCIAL_MEDIA_SKIP_DOMAINS = new Set([
  ...Object.keys(SOCIAL_MEDIA_DOMAINS),
  'yelp.com',
  'tiktok.com',
  'youtube.com',
]);

function isSocialMediaUrl(url: string): { isSocial: boolean; platform?: keyof ExtractedData['social'] } {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    for (const [domain, platform] of Object.entries(SOCIAL_MEDIA_DOMAINS)) {
      if (hostname === domain || hostname.endsWith('.' + domain)) {
        return { isSocial: true, platform };
      }
    }
    for (const domain of SOCIAL_MEDIA_SKIP_DOMAINS) {
      if (hostname === domain || hostname.endsWith('.' + domain)) {
        return { isSocial: true };
      }
    }
  } catch {
    // invalid URL, not social
  }
  return { isSocial: false };
}

// ============ Main ============

/** Map batch lead to Business shape for scraper */
function batchLeadToBusiness(lead: BatchLead): { id: string; place_id: string; business_name: string; website_uri: string; phone?: string } {
  const website = lead.website ? (normalizeUrl(lead.website) ?? lead.website) : lead.website;
  return {
    id: lead.id,
    place_id: lead.place_id,
    business_name: lead.website || lead.place_id,
    website_uri: website,
    phone: lead.phone ?? undefined,
  };
}

/** Enqueue a lead for deep scrape (browser-only) */
async function enqueueForDeepScrape(lead: { id: string; place_id: string; website_uri: string; phone?: string }): Promise<void> {
  await sqsClient.send(new SendMessageCommand({
    QueueUrl: DEEP_SCRAPE_QUEUE_URL,
    MessageBody: JSON.stringify({
      lead_id: lead.id,
      place_id: lead.place_id,
      website: lead.website_uri,
      phone: lead.phone ?? null,
    }),
  }));
}

async function main(): Promise<void> {
  await bootstrapDatabaseUrl();
  const db = new PrismaClient();
  prisma = db;

  // Parse job input
  const jobInputStr = process.env.JOB_INPUT;
  let jobInput: JobInput = {};

  if (jobInputStr) {
    try {
      jobInput = JSON.parse(jobInputStr);
      console.log('Parsed JOB_INPUT:', JSON.stringify(jobInput, null, 2));
    } catch (e) {
      console.warn('Could not parse JOB_INPUT, using defaults');
    }
  } else {
    console.log('No JOB_INPUT provided, using defaults');
  }

  const fastMode = jobInput.fastMode !== false; // default true
  const modeLabel = fastMode ? 'Fast (cloudscraper only)' : 'Deep (browser only)';
  console.log(`=== Scrape Task [${modeLabel}] ===`);
  console.log(`Bucket: ${CAMPAIGN_DATA_BUCKET}`);

  const taskId = jobInput.taskId ?? jobInput.jobId;
  const requestedMaxPagesPerSite = jobInput.maxPagesPerSite ?? LIMITS.MAX_PAGES_PER_LEAD;
  const maxPagesPerSite = Math.min(requestedMaxPagesPerSite, LIMITS.MAX_PAGES_PER_LEAD);

  // Read batch from S3 (scrape-trigger writes { id, place_id, website }[] per batch)
  const batchS3Key = jobInput.batchS3Key;
  if (!batchS3Key) {
    console.log('No batchS3Key provided. Exiting (distributed mode required).');
    return;
  }

  console.log(`Reading batch from s3://${CAMPAIGN_DATA_BUCKET}/${batchS3Key}`);

  let batchLeads: BatchLead[];
  try {
    const response = await s3Client.send(new GetObjectCommand({
      Bucket: CAMPAIGN_DATA_BUCKET,
      Key: batchS3Key,
    }));

    const bodyString = await response.Body?.transformToString();
    if (!bodyString) {
      throw new Error('Empty response from S3');
    }

    batchLeads = JSON.parse(bodyString) as BatchLead[];
    console.log(`Loaded ${batchLeads.length} leads from batch ${jobInput.batchIndex ?? 'unknown'}`);
  } catch (error) {
    console.error('Failed to read batch from S3:', error);
    throw error;
  }

  // Filter to leads with website
  const leadsToScrape = batchLeads.filter(l => l.website);
  const businesses = leadsToScrape.map(batchLeadToBusiness);

  const concurrency = jobInput.concurrency || calculateOptimalConcurrency(fastMode);

  console.log(`Task resources: ${TASK_MEMORY_MIB}MB memory, ${TASK_CPU_UNITS} CPU units`);
  console.log(`Using concurrency: ${concurrency}`);
  if (requestedMaxPagesPerSite > LIMITS.MAX_PAGES_PER_LEAD) {
    console.log(
      `Requested max pages per site (${requestedMaxPagesPerSite}) exceeds limit; capping at ${LIMITS.MAX_PAGES_PER_LEAD}`
    );
  }
  console.log(`Max pages per site: ${maxPagesPerSite}`);
  console.log(`Leads to scrape: ${businesses.length}`);

  if (businesses.length === 0) {
    console.log('No businesses need scraping. Exiting.');
    return;
  }

  const domainTracker = new DomainTracker();
  const globalFailureTracker = new FailureTracker();

  // Deep mode: launch browser eagerly at task start
  let browser: Browser | null = null;
  let pagePool: PagePool | null = null;

  if (!fastMode) {
    console.log('[CloakBrowser] Launching stealth browser (deep mode)...');
    browser = await launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    pagePool = new PagePool(browser, concurrency);
    console.log('[CloakBrowser] Browser ready');
  }

  let processed = 0;
  let failed = 0;
  let deferred = 0;
  let totalPages = 0;
  let totalBytes = 0;
  const startTimeTotal = Date.now();

  try {

  for (let i = 0; i < businesses.length; i += concurrency) {
    const chunk = businesses.slice(i, i + concurrency);

    await Promise.all(chunk.map(async (business) => {
      const startTime = Date.now();
      const pipelineStatus = fastMode ? 'scraping' : 'deep_scraping';

      try {
        console.log(`\nScraping: ${business.business_name} (${business.website_uri})`);
        await db.lead.update({ where: { id: business.id }, data: { pipelineStatus } });

        // Skip social media root URLs — no useful data to scrape
        const socialCheck = isSocialMediaUrl(business.website_uri!);
        if (socialCheck.isSocial) {
          console.log(`  [Social skip] ${business.website_uri} is a social media link, skipping scrape`);
          const socialData: ExtractedData = {
            emails: [], phones: [], contact_page_url: null,
            social: socialCheck.platform ? { [socialCheck.platform]: business.website_uri } : {},
          };
          await updateLeadWithScrapeData(
            db, business.id, business.website_uri!, 'cloudscraper', 0, 0,
            socialData, [], taskId ?? undefined,
          );
          processed++;
          return;
        }

        // Scrape using mode-appropriate method
        const scrapeResult = await scrapeWebsite(business.website_uri!, {
          maxPages: maxPagesPerSite,
          browser: fastMode ? null : browser,
          pagePool: fastMode ? null : pagePool,
          domainTracker,
          failureTracker: globalFailureTracker,
          enableEarlyExit: false,
        }) as ScrapeWebsiteExtendedResult;

        const { pages, method } = scrapeResult;

        // Fast mode: defer to deep scrape queue if cloudscraper can't handle it
        if (fastMode) {
          const needsBrowser =
            pages.length === 0 ||
            (pages.length > 0 && needsPlaywright(pages[0].html));

          if (needsBrowser && DEEP_SCRAPE_QUEUE_URL) {
            const reason = pages.length === 0 ? 'cloudscraper failed' : 'SPA detected';
            console.log(`  [${reason}] Deferring ${business.website_uri} to deep scrape queue`);
            await db.lead.update({
              where: { id: business.id },
              data: { pipelineStatus: 'queued_for_deep_scrape' },
            });
            await enqueueForDeepScrape(business);
            deferred++;
            return;
          }
        }

        if (pages.length === 0) {
          console.log(`  ✗ No pages scraped for ${business.business_name}`);
          await markLeadScrapeFailed(db, business.id, business.website_uri, taskId ?? undefined, 'No pages scraped');
          failed++;
          return;
        }

        const durationMs = Date.now() - startTime;
        const pageBytes = pages.reduce((sum, p) => sum + p.html.length, 0);

        const knownPhones: string[] = [];
        if (business.phone) knownPhones.push(String(business.phone));
        const extracted = extractAllData(pages, knownPhones);

        // Convert scraped pages to markdown and upload to S3
        const scrapeRunId = randomUUID();
        let scrapeMarkdownS3Key: string | null = null;
        let pageMarkdownKeys: Map<string, string> | undefined;
        try {
          const mdResult = await convertAndUploadMarkdown(pages, business.id, scrapeRunId);
          scrapeMarkdownS3Key = mdResult.combinedS3Key;
          pageMarkdownKeys = mdResult.pageMarkdownKeys;
        } catch (mdErr) {
          console.warn(`  [Markdown] Failed to upload markdown for ${business.business_name}:`, mdErr);
        }

        const pagesForStorage = pages.map((p) => ({
          url: p.url,
          status_code: p.status_code,
          scraped_at: p.scraped_at,
          parentUrl: p.parentUrl ?? null,
          depth: p.depth ?? 0,
        }));

        await updateLeadWithScrapeData(
          db,
          business.id,
          business.website_uri!,
          method,
          pages.length,
          durationMs,
          extracted,
          pagesForStorage,
          taskId ?? undefined,
          scrapeMarkdownS3Key,
          pageMarkdownKeys,
        );

        processed++;
        totalPages += pages.length;
        totalBytes += pageBytes;

        console.log(`  ✓ Scraped ${pages.length} pages (${method}), ${extracted.emails.length} emails`);

      } catch (error) {
        failed++;
        console.error(`  ✗ Failed for ${business.business_name}:`, error);
        const errorMsg = error instanceof Error ? error.message : String(error);
        try {
          await db.lead.update({ where: { id: business.id }, data: { pipelineStatus: 'scrape_failed', scrapeError: errorMsg.slice(0, 500) } });
        } catch { /* best effort */ }
      }
    }));

    console.log(`\nProgress: ${processed + failed + deferred}/${businesses.length}`);
  }

  } finally {
    try { if (pagePool) await (pagePool as PagePool).closeAll(); } catch { /* ignore */ }
    try { if (browser) await (browser as Browser).close(); } catch { /* ignore */ }
  }

  const totalDurationMs = Date.now() - startTimeTotal;
  const avgTimePerBusiness = businesses.length > 0 ? Math.round(totalDurationMs / businesses.length) : 0;

  // Log comprehensive summary
  console.log('\n=== Scrape Task Complete ===');
  console.log(`Mode: ${modeLabel}`);
  console.log(`Duration: ${(totalDurationMs / 1000).toFixed(1)}s (${avgTimePerBusiness}ms avg per business)`);
  console.log(`Processed: ${processed}`);
  console.log(`Failed: ${failed}`);
  if (deferred > 0) {
    console.log(`Deferred to deep scrape: ${deferred}`);
  }
  console.log(`Total pages scraped: ${totalPages}`);
  console.log(`Total bytes: ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);

  // Log failure breakdown
  globalFailureTracker.logSummary();

  // Log domain success rates for domains with failures
  const domainStats = domainTracker.getStats();
  const problemDomains = domainStats
    .filter(d => d.failed > 0)
    .sort((a, b) => b.failed - a.failed)
    .slice(0, 10);

  if (problemDomains.length > 0) {
    console.log(`\n[Domain Issues] Top ${problemDomains.length} domains with failures:`);
    for (const domain of problemDomains) {
      const rate = Math.round(100 * domain.succeeded / domain.attempted);
      const errorTypes = Object.entries(domain.errors)
        .map(([type, count]) => `${type}:${count}`)
        .join(', ');
      console.log(`  ${domain.domain}: ${rate}% success (${domain.succeeded}/${domain.attempted}) - ${errorTypes}`);
    }
  }

  // Update FargateTask status (for event-driven mode)
  if (taskId) {
    await updateFargateTask(db, taskId, 'completed');
  }

  // Output summary for distributed mode
  console.log(`SCRAPE_RESULT:${JSON.stringify({ processed, failed, deferred, total_pages: totalPages })}`);
}

main().catch(async (error) => {
  console.error('Task failed:', error);
  const jobInputStr = process.env.JOB_INPUT;
  let taskId: string | undefined;
  if (jobInputStr) {
    try {
      const jobInput = JSON.parse(jobInputStr);
      taskId = jobInput.taskId ?? jobInput.jobId;
    } catch {
      // ignore
    }
  }
  if (taskId && prisma) {
    try {
      await updateFargateTask(prisma, taskId, 'failed', error instanceof Error ? error.message : String(error));
    } catch (e) {
      console.error('Failed to update task status:', e);
    }
  }
  process.exit(1);
});
