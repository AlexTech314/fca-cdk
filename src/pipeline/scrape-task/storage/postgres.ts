/**
 * Postgres storage for scrape task.
 * Updates leads with web_scraped_at and web_scraped_data.
 * Updates jobs with scrape metrics in metadata.
 */

import { Client } from 'pg';
import type { ExtractedData, ScrapeMetrics } from '../types.js';
import { getPgClient } from '../config.js';

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
  const pg = await getPgClient();
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

  await pg.query(
    `UPDATE leads SET
       web_scraped_at = NOW(),
       web_scraped_data = $1,
       updated_at = NOW()
     WHERE id = $2`,
    [JSON.stringify(webScrapedData), leadId]
  );
  console.log(`  [Postgres] Updated lead ${leadId} with scrape data`);
}

/**
 * Mark a lead as failed to scrape
 */
export async function markLeadScrapeFailed(leadId: string): Promise<void> {
  const pg = await getPgClient();
  await pg.query(
    `UPDATE leads SET
       web_scraped_at = NOW(),
       web_scraped_data = $1,
       updated_at = NOW()
     WHERE id = $2`,
    [JSON.stringify({ status: 'failed', failed_at: new Date().toISOString() }), leadId]
  );
  console.log(`  [Postgres] Marked lead ${leadId} as scrape failed`);
}

/**
 * Update job metrics in Postgres
 */
export async function updateJobMetrics(
  jobId: string,
  metrics: ScrapeMetrics
): Promise<void> {
  const pg = await getPgClient();
  await pg.query(
    `UPDATE jobs SET
       metadata = COALESCE(metadata, '{}'::jsonb) || $1::jsonb,
       updated_at = NOW()
     WHERE id = $2`,
    [JSON.stringify({ scrape: metrics }), jobId]
  );
  console.log(`  [Postgres] Updated job ${jobId} metrics`);
}
