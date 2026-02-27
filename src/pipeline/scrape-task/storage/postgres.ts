/**
 * Postgres storage for scrape task.
 * Creates ScrapeRun, ScrapedPage tree, normalized contact tables, and updates Lead.
 * All writes are wrapped in a transaction for atomicity.
 */

import type { PrismaClient } from '@prisma/client';
import type { ExtractedData } from '../types.js';

export interface BatchLead {
  id: string;
  place_id: string;
  website: string;
  phone?: string | null;
}

function extractDomain(url: string): string {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

interface ScrapedPageInput {
  url: string;
  status_code: number;
  scraped_at: string;
  parentUrl?: string | null;
  depth?: number;
}

/**
 * Update a lead with scrape results inside a single transaction.
 */
export async function updateLeadWithScrapeData(
  prisma: PrismaClient,
  leadId: string,
  websiteUrl: string,
  scrapeMethod: 'cloudscraper' | 'puppeteer',
  pagesCount: number,
  durationMs: number,
  extracted: ExtractedData,
  pages: ScrapedPageInput[],
  taskId?: string,
  scrapeMarkdownS3Key?: string | null,
): Promise<void> {
  const scrapedAt = new Date();
  const domain = extractDomain(websiteUrl);

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { franchiseId: true },
  });

  await (prisma.$transaction as Function)(async (tx: PrismaClient) => {
    // 1. Create ScrapeRun
    const scrapeRun = await tx.scrapeRun.create({
      data: {
        leadId,
        taskId: taskId ?? null,
        rootUrl: websiteUrl,
        status: 'completed',
        startedAt: new Date(scrapedAt.getTime() - durationMs),
        completedAt: scrapedAt,
        methodSummary: scrapeMethod,
        pagesCount,
        durationMs,
      },
    });

    // 2. Create ScrapedPage tree (sequential for parent linkage)
    const urlToPageId = new Map<string, string>();
    for (const p of pages) {
      const parentScrapedPageId = p.parentUrl ? urlToPageId.get(p.parentUrl) ?? null : null;
      const sp = await tx.scrapedPage.create({
        data: {
          scrapeRunId: scrapeRun.id,
          leadId,
          parentScrapedPageId,
          depth: p.depth ?? 0,
          url: p.url,
          domain,
          scrapeMethod,
          statusCode: p.status_code,
          scrapedAt: new Date(p.scraped_at),
          durationMs: pages.length === 1 ? durationMs : null,
        },
      });
      urlToPageId.set(p.url, sp.id);
    }

    const firstPageId = urlToPageId.get(websiteUrl) ?? [...urlToPageId.values()][0];
    if (!firstPageId) {
      throw new Error('No scraped pages for provenance');
    }
    const runId = scrapeRun.id;

    const resolvePageId = (sourceUrl?: string | null) =>
      (sourceUrl ? urlToPageId.get(sourceUrl) : null) ?? firstPageId;

    // 3. Delete old extracted contact data, then insert fresh
    await tx.leadSocialProfile.deleteMany({ where: { leadId } });

    // 3a. Upsert emails (dedupe by value)
    for (const email of extracted.emails) {
      const normalizedEmail = email.toLowerCase().trim();
      const sourcePageId = resolvePageId(extracted.emailSources?.[email]);
      await tx.leadEmail.upsert({
        where: { leadId_value: { leadId, value: normalizedEmail } },
        update: { sourcePageId, sourceRunId: runId },
        create: { leadId, value: normalizedEmail, sourcePageId, sourceRunId: runId },
      });
    }

    // 3b. Upsert phones (dedupe by value)
    for (const phone of extracted.phones) {
      const sourcePageId = resolvePageId(extracted.phoneSources?.[phone]);
      await tx.leadPhone.upsert({
        where: { leadId_value: { leadId, value: phone } },
        update: { sourcePageId, sourceRunId: runId },
        create: { leadId, value: phone, sourcePageId, sourceRunId: runId },
      });
    }

    // 3c. Insert social profiles (fresh per run)
    const socialPlatforms = ['linkedin', 'facebook', 'instagram', 'twitter'] as const;
    for (const platform of socialPlatforms) {
      const url = extracted.social[platform];
      if (url) {
        const sourcePageId = resolvePageId(extracted.socialSources?.[platform]);
        await tx.leadSocialProfile.create({
          data: { leadId, platform, url, sourcePageId, sourceRunId: runId },
        });
      }
    }

    // 4. Update Lead scalar fields
    await tx.lead.update({
      where: { id: leadId },
      data: {
        webScrapedAt: scrapedAt,
        contactPageUrl: extracted.contact_page_url,
        scrapeMarkdownS3Key: scrapeMarkdownS3Key ?? null,
        pipelineStatus: 'idle',
      },
    });

    // 5. Link to franchise if applicable
    if (lead?.franchiseId) {
      await tx.franchiseScrapedPage.createMany({
        data: [...urlToPageId.values()].map((scrapedPageId) => ({
          franchiseId: lead.franchiseId!,
          scrapedPageId,
        })),
        skipDuplicates: true,
      });
    }

    console.log(`  [Prisma] Created ScrapeRun ${scrapeRun.id}, ${pages.length} ScrapedPages, updated lead ${leadId}`);
  }, { timeout: 30000 });
}

/**
 * Create a failed ScrapeRun and mark the lead as scraped (for audit trail)
 */
export async function markLeadScrapeFailed(
  prisma: PrismaClient,
  leadId: string,
  websiteUrl?: string,
  taskId?: string,
  errorMessage?: string,
): Promise<void> {
  const now = new Date();
  await prisma.scrapeRun.create({
    data: {
      leadId,
      taskId: taskId ?? null,
      rootUrl: websiteUrl ?? 'unknown',
      status: 'failed',
      startedAt: now,
      completedAt: now,
      methodSummary: errorMessage ? errorMessage.slice(0, 200) : 'scrape failed',
      pagesCount: 0,
      durationMs: 0,
    },
  });
  await prisma.lead.update({
    where: { id: leadId },
    data: { webScrapedAt: now, pipelineStatus: 'idle' },
  });
  console.log(`  [Prisma] Created failed ScrapeRun for lead ${leadId}`);
}

/**
 * Update FargateTask status in Postgres
 */
export async function updateFargateTask(
  prisma: PrismaClient,
  taskId: string,
  status: 'completed' | 'failed',
  errorMessage?: string
): Promise<void> {
  await prisma.fargateTask.update({
    where: { id: taskId },
    data: {
      status,
      completedAt: new Date(),
      errorMessage: errorMessage ?? null,
    },
  });
  console.log(`  [Prisma] Updated FargateTask ${taskId} status: ${status}`);
}
