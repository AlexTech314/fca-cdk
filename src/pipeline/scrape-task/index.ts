/**
 * Web Scrape Task (Fargate)
 *
 * Scrapes lead websites using Puppeteer. Each invocation processes a batch
 * of leads (read from S3 batch file). Updates Postgres with scraped data.
 *
 * Environment:
 *   JOB_INPUT - JSON string with batch reference { batchS3Key, jobId, ... }
 *   DATABASE_URL - PostgreSQL connection string (via RDS Proxy)
 *   CAMPAIGN_DATA_BUCKET - S3 bucket
 */

import { Client } from 'pg';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import type { Browser } from 'puppeteer';
import puppeteer from 'puppeteer';

const s3Client = new S3Client({});
const DATABASE_URL = process.env.DATABASE_URL!;
const CAMPAIGN_DATA_BUCKET = process.env.CAMPAIGN_DATA_BUCKET!;

interface LeadToScrape {
  id: string;
  place_id: string;
  website: string;
}

interface ScrapeResult {
  lead_id: string;
  success: boolean;
  pages_count: number;
  total_bytes: number;
  duration_ms: number;
  emails: string[];
  phones: string[];
  error?: string;
}

async function scrapeSite(url: string, browser: Browser): Promise<{
  html: string;
  emails: string[];
  phones: string[];
  pages_count: number;
  total_bytes: number;
}> {
  const page = await browser.newPage();
  await page.setDefaultTimeout(30000);

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const html = await page.content();

    // Extract emails and phones from page content
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const phoneRegex = /(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/g;

    const emails: string[] = [...new Set(html.match(emailRegex) ?? [])];
    const phones: string[] = [...new Set(html.match(phoneRegex) ?? [])];

    return {
      html,
      emails,
      phones,
      pages_count: 1,
      total_bytes: Buffer.byteLength(html, 'utf-8'),
    };
  } finally {
    await page.close();
  }
}

async function main() {
  const jobInput = JSON.parse(process.env.JOB_INPUT || '{}');
  const { batchS3Key, jobId } = jobInput;

  console.log(`Scrape task starting - batch: ${batchS3Key}`);

  // Read batch file from S3
  const s3Result = await s3Client.send(new GetObjectCommand({
    Bucket: CAMPAIGN_DATA_BUCKET,
    Key: batchS3Key,
  }));
  const body = await s3Result.Body?.transformToString();
  if (!body) {
    console.error('Empty batch file');
    process.exit(1);
  }

  const leads: LeadToScrape[] = JSON.parse(body);
  console.log(`Processing ${leads.length} leads`);

  // Launch Puppeteer
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  // Connect to Postgres
  const pgClient = new Client({ connectionString: DATABASE_URL });
  await pgClient.connect();

  const results: ScrapeResult[] = [];

  try {
    for (const lead of leads) {
      const startTime = Date.now();

      try {
        if (!lead.website) {
          results.push({
            lead_id: lead.id,
            success: false,
            pages_count: 0,
            total_bytes: 0,
            duration_ms: 0,
            emails: [],
            phones: [],
            error: 'No website URL',
          });
          continue;
        }

        const scrapeData = await scrapeSite(lead.website, browser);
        const duration_ms = Date.now() - startTime;

        // Save raw HTML to S3
        const rawS3Key = `scraped-data/${lead.place_id}/raw.html`;
        await s3Client.send(new PutObjectCommand({
          Bucket: CAMPAIGN_DATA_BUCKET,
          Key: rawS3Key,
          Body: scrapeData.html,
          ContentType: 'text/html',
        }));

        // Update Postgres
        await pgClient.query(
          `UPDATE leads SET
             web_scraped_at = NOW(),
             web_scraped_data = $1,
             updated_at = NOW()
           WHERE id = $2`,
          [
            JSON.stringify({
              emails: scrapeData.emails,
              phones: scrapeData.phones,
              pages_count: scrapeData.pages_count,
              total_bytes: scrapeData.total_bytes,
              duration_ms,
              raw_s3_key: rawS3Key,
            }),
            lead.id,
          ]
        );

        results.push({
          lead_id: lead.id,
          success: true,
          pages_count: scrapeData.pages_count,
          total_bytes: scrapeData.total_bytes,
          duration_ms,
          emails: scrapeData.emails,
          phones: scrapeData.phones,
        });

        console.log(`Scraped ${lead.website}: ${scrapeData.emails.length} emails, ${scrapeData.phones.length} phones (${duration_ms}ms)`);
      } catch (error) {
        const duration_ms = Date.now() - startTime;
        console.error(`Failed to scrape ${lead.website}:`, error);

        results.push({
          lead_id: lead.id,
          success: false,
          pages_count: 0,
          total_bytes: 0,
          duration_ms,
          emails: [],
          phones: [],
          error: String(error),
        });
      }
    }

    // Write results summary to S3
    const resultS3Key = `jobs/${jobId}/results/${batchS3Key.split('/').pop()}`;
    await s3Client.send(new PutObjectCommand({
      Bucket: CAMPAIGN_DATA_BUCKET,
      Key: resultS3Key,
      Body: JSON.stringify(results),
      ContentType: 'application/json',
    }));

    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;
    console.log(`Scrape task complete: ${succeeded} succeeded, ${failed} failed out of ${leads.length}`);
  } finally {
    await browser.close();
    await pgClient.end();
  }
}

main().catch((error) => {
  console.error('Scrape task failed:', error);
  process.exit(1);
});
