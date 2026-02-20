/**
 * Postgres storage for scrape task.
 * Creates ScrapedPage records with Lead/Franchise junctions.
 * Also updates leads with web_scraped_at and web_scraped_data for backward compatibility.
 */

import { prisma } from '@fca/db';
import type { ExtractedData, ScrapeMetrics } from '../types.js';

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

/**
 * Update a lead with scrape results: create ScrapedPage, junctions, and update lead.
 */
export async function updateLeadWithScrapeData(
  leadId: string,
  websiteUrl: string,
  rawS3Key: string,
  extractedS3Key: string,
  scrapeMethod: 'cloudscraper' | 'puppeteer',
  pagesCount: number,
  totalBytes: number,
  durationMs: number,
  extracted: ExtractedData
): Promise<void> {
  const scrapedAt = new Date();
  const domain = extractDomain(websiteUrl);
  const extractedDataJson = {
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

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { franchiseId: true },
  });

  const scrapedPage = await prisma.scrapedPage.create({
    data: {
      url: websiteUrl,
      domain,
      scrapeMethod,
      statusCode: null,
      scrapedAt,
      durationMs,
      rawS3Key,
      extractedS3Key,
      extractedData: extractedDataJson,
    },
  });

  await prisma.leadScrapedPage.create({
    data: { leadId, scrapedPageId: scrapedPage.id },
  });

  if (lead?.franchiseId) {
    await prisma.franchiseScrapedPage.create({
      data: { franchiseId: lead.franchiseId, scrapedPageId: scrapedPage.id },
    });
  }

  const webScrapedData = {
    rawS3Key,
    extractedS3Key,
    scrapeMethod,
    pagesCount,
    totalBytes,
    durationMs,
    ...extractedDataJson,
  };

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      webScrapedAt: scrapedAt,
      webScrapedData: JSON.parse(JSON.stringify(webScrapedData)),
    },
  });
  console.log(`  [Prisma] Created ScrapedPage ${scrapedPage.id}, updated lead ${leadId}`);
}

/**
 * Mark a lead as failed to scrape
 */
export async function markLeadScrapeFailed(leadId: string): Promise<void> {
  await prisma.lead.update({
    where: { id: leadId },
    data: {
      webScrapedAt: new Date(),
      webScrapedData: { status: 'failed', failed_at: new Date().toISOString() },
    },
  });
  console.log(`  [Prisma] Marked lead ${leadId} as scrape failed`);
}

/**
 * Update job metrics in Postgres
 */
export async function updateJobMetrics(
  jobId: string,
  metrics: ScrapeMetrics
): Promise<void> {
  // Use raw query for JSONB merge since Prisma doesn't support this natively
  await prisma.$executeRaw`
    UPDATE jobs SET
      metadata = COALESCE(metadata, '{}'::jsonb) || ${JSON.stringify({ scrape: metrics })}::jsonb,
      updated_at = NOW()
    WHERE id = ${jobId}`;
  console.log(`  [Prisma] Updated job ${jobId} metrics`);
}
