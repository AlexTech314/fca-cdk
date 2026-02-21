import puppeteer, { Browser } from 'puppeteer';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { bootstrapDatabaseUrl } from '@fca/db';
import { PrismaClient } from '@prisma/client';

import type { JobInput, RawScrapeData, ExtractedScrapeData, ScrapeMetrics } from './types.js';
import {
  CAMPAIGN_DATA_BUCKET,
  TASK_MEMORY_MIB,
  TASK_CPU_UNITS,
  calculateOptimalConcurrency,
  s3Client,
} from './config.js';
import { 
  scrapeWebsite, 
  PagePool, 
  DomainTracker, 
  FailureTracker,
  ScrapeWebsiteExtendedResult,
} from './scraper/index.js';
import { extractAllData } from './extractors/index.js';
import { uploadToS3 } from './storage/s3.js';
import {
  updateLeadWithScrapeData,
  markLeadScrapeFailed,
  updateFargateTask,
} from './storage/postgres.js';
import type { BatchLead } from './storage/postgres.js';

// ============ Main ============

/** Map batch lead to Business shape for scraper */
function batchLeadToBusiness(lead: BatchLead): { id: string; place_id: string; business_name: string; website_uri: string; phone?: string } {
  return {
    id: lead.id,
    place_id: lead.place_id,
    business_name: lead.website || lead.place_id,
    website_uri: lead.website,
    phone: lead.phone ?? undefined,
  };
}

async function main(): Promise<void> {
  await bootstrapDatabaseUrl();
  const prisma = new PrismaClient();
  console.log('=== Scrape Task (Cloudscraper with Puppeteer Fallback) ===');
  console.log(`Bucket: ${CAMPAIGN_DATA_BUCKET}`);
  
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
  
  const taskId = jobInput.taskId ?? jobInput.jobId;
  const maxPagesPerSite = jobInput.maxPagesPerSite ?? 15;
  
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
  
  const fastMode = jobInput.fastMode ?? true;
  const calculatedConcurrency = calculateOptimalConcurrency(fastMode);
  const concurrency = jobInput.concurrency || calculatedConcurrency;
  
  console.log(`Task resources: ${TASK_MEMORY_MIB}MB memory, ${TASK_CPU_UNITS} CPU units`);
  console.log(`Calculated optimal concurrency: ${calculatedConcurrency}`);
  console.log(`Using concurrency: ${concurrency}`);
  console.log(`Max pages per site: ${maxPagesPerSite}`);
  console.log(`Fast mode (no Puppeteer): ${fastMode}`);
  console.log(`Leads to scrape: ${businesses.length}`);
  
  if (businesses.length === 0) {
    console.log('No businesses need scraping. Exiting.');
    return;
  }
  
  // Initialize tracking
  const domainTracker = new DomainTracker();
  const globalFailureTracker = new FailureTracker();
  
  // Launch Puppeteer browser and page pool - skip in fast mode
  let browser: Browser | null = null;
  let pagePool: PagePool | null = null;
  
  if (!fastMode) {
    console.log('Launching Puppeteer browser...');
    try {
      const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
      if (executablePath) {
        console.log(`Using custom Chromium path: ${executablePath}`);
      }
      
      browser = await puppeteer.launch({
        headless: true,
        executablePath: executablePath || undefined,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
      });
      console.log('Browser launched successfully');
      
      // Create page pool for efficient page reuse
      // Pool size based on concurrency (1 page per concurrent site)
      const poolSize = Math.min(concurrency, 5);
      pagePool = new PagePool(browser, poolSize);
      console.log(`Page pool created with ${poolSize} pages`);
    } catch (error) {
      console.warn('Failed to launch Puppeteer, will use cloudscraper only:', error);
    }
  } else {
    console.log('Fast mode enabled - skipping Puppeteer for maximum speed');
  }
  
  // Process businesses
  let processed = 0;
  let failed = 0;
  let totalPages = 0;
  let totalBytes = 0;
  let cloudscraperCount = 0;
  let puppeteerCount = 0;
  const startTimeTotal = Date.now();
  
  for (let i = 0; i < businesses.length; i += concurrency) {
    const batch = businesses.slice(i, i + concurrency);
    
    await Promise.all(batch.map(async (business) => {
      const startTime = Date.now();
      
      try {
        console.log(`\nScraping: ${business.business_name} (${business.website_uri})`);
        
        // Use extended scrape options with all new features
        const scrapeResult = await scrapeWebsite(business.website_uri!, {
          maxPages: maxPagesPerSite,
          browser,
          pagePool,
          domainTracker,
          failureTracker: globalFailureTracker,
          enableEarlyExit: false,
        }) as ScrapeWebsiteExtendedResult;
        
        const { pages, method, cloudscraperCount: siteCloudscraperCount, puppeteerCount: sitePuppeteerCount } = scrapeResult;
        
        if (pages.length === 0) {
          console.log(`  ✗ No pages scraped for ${business.business_name}`);
          await markLeadScrapeFailed(prisma, business.id);
          failed++;
          return;
        }
        
        const durationMs = Date.now() - startTime;
        const pageBytes = pages.reduce((sum, p) => sum + p.html.length, 0);
        
        // Extract data (pass known phone to exclude from scraped phones)
        const knownPhones: string[] = [];
        if (business.phone) knownPhones.push(String(business.phone));
        const extracted = extractAllData(pages, knownPhones);
        
        // Create S3 keys
        const timestamp = Date.now();
        const baseKey = `scraped-data/${business.place_id}/${timestamp}`;
        const rawS3Key = `${baseKey}/raw.json.gz`;
        const extractedS3Key = `${baseKey}/extracted.json.gz`;
        
        // Prepare raw data
        const rawData: RawScrapeData = {
          place_id: business.place_id,
          website_uri: business.website_uri!,
          scraped_at: new Date().toISOString(),
          scrape_method: method,
          duration_ms: durationMs,
          pages,
        };
        
        // Prepare extracted data
        const extractedData: ExtractedScrapeData = {
          place_id: business.place_id,
          website_uri: business.website_uri!,
          extracted_at: new Date().toISOString(),
          contacts: {
            emails: extracted.emails,
            phones: extracted.phones,
            contact_page_url: extracted.contact_page_url,
            social: extracted.social,
          },
          team: {
            members: extracted.team_members,
            headcount_estimate: extracted.headcount_estimate,
            headcount_source: extracted.headcount_source,
            new_hire_mentions: extracted.new_hire_mentions,
          },
          acquisition: {
            signals: extracted.acquisition_signals,
            has_signal: extracted.has_acquisition_signal,
            summary: extracted.acquisition_summary,
          },
          history: {
            founded_year: extracted.founded_year,
            founded_source: extracted.founded_source,
            years_in_business: extracted.years_in_business,
            snippets: extracted.history_snippets,
          },
        };
        
        // Upload to S3 (parallel)
        await Promise.all([
          uploadToS3(CAMPAIGN_DATA_BUCKET, rawS3Key, rawData),
          uploadToS3(CAMPAIGN_DATA_BUCKET, extractedS3Key, extractedData),
        ]);
        
        // Update Postgres: create ScrapedPage, junctions, update lead
        await updateLeadWithScrapeData(
          prisma,
          business.id,
          business.website_uri!,
          rawS3Key,
          extractedS3Key,
          method,
          pages.length,
          pageBytes,
          durationMs,
          extracted
        );
        
        processed++;
        totalPages += pages.length;
        totalBytes += pageBytes;
        cloudscraperCount += siteCloudscraperCount;
        puppeteerCount += sitePuppeteerCount;
        
        console.log(`  ✓ Scraped ${pages.length} pages (cs: ${siteCloudscraperCount}, pp: ${sitePuppeteerCount}), ${extracted.emails.length} emails, ${extracted.team_members.length} team members`);
        
      } catch (error) {
        failed++;
        console.error(`  ✗ Failed for ${business.business_name}:`, error);
      }
    }));
    
    console.log(`\nProgress: ${processed + failed}/${businesses.length}`);
  }
  
  // Clean up
  if (pagePool) {
    await pagePool.closeAll();
  }
  if (browser) {
    await browser.close();
  }
  
  const totalDurationMs = Date.now() - startTimeTotal;
  const avgTimePerBusiness = businesses.length > 0 ? Math.round(totalDurationMs / businesses.length) : 0;
  
  // Log comprehensive summary
  console.log('\n=== Scrape Task Complete ===');
  console.log(`Duration: ${(totalDurationMs / 1000).toFixed(1)}s (${avgTimePerBusiness}ms avg per business)`);
  console.log(`Processed: ${processed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total pages scraped: ${totalPages}`);
  console.log(`Methods - Cloudscraper: ${cloudscraperCount}, Puppeteer: ${puppeteerCount}`);
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
  
  // Build metrics object
  const metrics: ScrapeMetrics = {
    processed,
    failed,
    filtered: 0,
    cloudscraper_count: cloudscraperCount,
    puppeteer_count: puppeteerCount,
    total_pages: totalPages,
    total_bytes: totalBytes,
  };
  
  // Update FargateTask status (for event-driven mode)
  if (taskId) {
    await updateFargateTask(prisma, taskId, 'completed', metrics);
  }
  
  // Output metrics for Step Functions aggregation (distributed mode)
  // This format is used for lead scraped updates
  console.log(`SCRAPE_RESULT:${JSON.stringify(metrics)}`);
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
  if (taskId) {
    try {
      await updateFargateTask(prisma, taskId, 'failed', undefined, error instanceof Error ? error.message : String(error));
    } catch (e) {
      console.error('Failed to update task status:', e);
    }
  }
  process.exit(1);
});
