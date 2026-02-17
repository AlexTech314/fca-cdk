/**
 * Postgres storage for scrape task.
 * Updates leads with web_scraped_at and web_scraped_data.
 * Updates jobs with scrape metrics in metadata.
 */

import { prisma } from '@fca/db';
import type { ExtractedData, ScrapeMetrics } from '../types.js';

export interface BatchLead {
  id: string;
  place_id: string;
  website: string;
  phone?: string | null;
}

/**
 * Update a lead with scrape results
 */
export async function updateLeadWithScrapeData(
  leadId: string,
  rawS3Key: string,
  extractedS3Key: string,
  scrapeMethod: 'cloudscraper' | 'puppeteer',
  pagesCount: number,
  totalBytes: number,
  durationMs: number,
  extracted: ExtractedData
): Promise<void> {
  const webScrapedData = {
    rawS3Key,
    extractedS3Key,
    scrapeMethod,
    pagesCount,
    totalBytes,
    durationMs,
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

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      webScrapedAt: new Date(),
      webScrapedData: JSON.parse(JSON.stringify(webScrapedData)),
    },
  });
  console.log(`  [Prisma] Updated lead ${leadId} with scrape data`);
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
