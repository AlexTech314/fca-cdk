/**
 * Postgres storage for scrape task.
 * Creates ScrapeRun, ScrapedPage tree, normalized extracted tables, and updates Lead scalar fields.
 * No S3 payload persistence. No legacy JSON blobs.
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

/** In-memory page from scraper (has url, parentUrl, depth) */
interface ScrapedPageInput {
  url: string;
  status_code: number;
  scraped_at: string;
  parentUrl?: string | null;
  depth?: number;
}

/**
 * Update a lead with scrape results: create ScrapeRun, ScrapedPage tree, normalized extracted rows, update Lead scalars.
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
  taskId?: string
): Promise<void> {
  const scrapedAt = new Date();
  const domain = extractDomain(websiteUrl);

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { franchiseId: true },
  });

  // 1. Create ScrapeRun
  const scrapeRun = await prisma.scrapeRun.create({
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

  // 2. Create ScrapedPage for each crawled page (build url->id map for parent linkage)
  const urlToPageId = new Map<string, string>();
  for (const p of pages) {
    const parentScrapedPageId = p.parentUrl ? urlToPageId.get(p.parentUrl) ?? null : null;
    const sp = await prisma.scrapedPage.create({
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

  // Root page for assigning provenance when source_url is unknown
  const rootPageId = urlToPageId.get(websiteUrl) ?? urlToPageId.values().next().value;
  const effectiveRootPageId = rootPageId ?? [...urlToPageId.values()][0];
  if (!effectiveRootPageId) {
    throw new Error('No scraped pages for provenance');
  }
  const scrapeRunId = scrapeRun.id;

  // 3. Insert normalized extracted rows with provenance (upsert to avoid duplicates across runs)
  for (const email of extracted.emails) {
    const sourceUrl = (extracted as { emailSources?: Record<string, string> }).emailSources?.[email];
    const sourcePageId = sourceUrl ? urlToPageId.get(sourceUrl) : null;
    const normalizedEmail = email.toLowerCase().trim();
    await prisma.leadEmail.upsert({
      where: { leadId_value: { leadId, value: normalizedEmail } },
      update: { sourcePageId: sourcePageId ?? effectiveRootPageId, sourceRunId: scrapeRunId },
      create: {
        leadId,
        value: normalizedEmail,
        sourcePageId: sourcePageId ?? effectiveRootPageId,
        sourceRunId: scrapeRunId,
      },
    });
  }

  for (const phone of extracted.phones) {
    const sourceUrl = (extracted as { phoneSources?: Record<string, string> }).phoneSources?.[phone];
    const sourcePageId = sourceUrl ? urlToPageId.get(sourceUrl) : null;
    await prisma.leadPhone.upsert({
      where: { leadId_value: { leadId, value: phone } },
      update: { sourcePageId: sourcePageId ?? effectiveRootPageId, sourceRunId: scrapeRunId },
      create: {
        leadId,
        value: phone,
        sourcePageId: sourcePageId ?? effectiveRootPageId,
        sourceRunId: scrapeRunId,
      },
    });
  }

  const socialPlatforms = ['linkedin', 'facebook', 'instagram', 'twitter'] as const;
  for (const platform of socialPlatforms) {
    const url = extracted.social[platform];
    if (url) {
      const sourceUrl = (extracted as { socialSources?: Record<string, string> }).socialSources?.[platform];
      const sourcePageId = sourceUrl ? urlToPageId.get(sourceUrl) : null;
      await prisma.leadSocialProfile.create({
        data: {
          leadId,
          platform,
          url,
          sourcePageId: sourcePageId ?? effectiveRootPageId,
          sourceRunId: scrapeRunId,
        },
      });
    }
  }

  for (const member of extracted.team_members) {
    const sourcePageId = member.source_url ? urlToPageId.get(member.source_url) : null;
    if (sourcePageId) {
      await prisma.leadTeamMember.create({
        data: {
          leadId,
          name: member.name,
          title: member.title ?? null,
          sourceUrl: member.source_url,
          sourcePageId,
          sourceRunId: scrapeRunId,
        },
      });
    }
  }

  for (const signal of extracted.acquisition_signals) {
    const sourcePageId = signal.source_url ? urlToPageId.get(signal.source_url) : null;
    if (sourcePageId) {
      await prisma.leadAcquisitionSignal.create({
        data: {
          leadId,
          signalType: signal.signal_type,
          text: signal.text,
          dateMentioned: signal.date_mentioned ?? null,
          sourcePageId,
          sourceRunId: scrapeRunId,
        },
      });
    }
  }

  // 4. Update Lead scalar fields
  await prisma.lead.update({
    where: { id: leadId },
    data: {
      webScrapedAt: scrapedAt,
      foundedYear: extracted.founded_year,
      yearsInBusiness: extracted.years_in_business,
      headcountEstimate: extracted.headcount_estimate,
      hasAcquisitionSignal: extracted.has_acquisition_signal,
      acquisitionSummary: extracted.acquisition_summary,
      contactPageUrl: extracted.contact_page_url,
    },
  });

  // 5. Link to franchise if applicable
  if (lead?.franchiseId) {
    await prisma.franchiseScrapedPage.createMany({
      data: [...urlToPageId.values()].map((scrapedPageId) => ({
        franchiseId: lead.franchiseId!,
        scrapedPageId,
      })),
      skipDuplicates: true,
    });
  }

  console.log(`  [Prisma] Created ScrapeRun ${scrapeRun.id}, ${pages.length} ScrapedPages, updated lead ${leadId}`);
}

/**
 * Mark a lead as failed to scrape (update run status only; no JSON blob)
 */
export async function markLeadScrapeFailed(prisma: PrismaClient, leadId: string): Promise<void> {
  // Create a failed ScrapeRun if we have context, otherwise just ensure lead has webScrapedAt
  // For now we only update webScrapedAt to indicate we attempted (simplest failure path)
  await prisma.lead.update({
    where: { id: leadId },
    data: { webScrapedAt: new Date() },
  });
  console.log(`  [Prisma] Marked lead ${leadId} as scrape failed`);
}

/**
 * Update FargateTask status in Postgres (no metrics - those live on ScrapeRun)
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
