/**
 * Prepare Scrape Lambda
 *
 * Queries Postgres for leads that need web scraping, writes batch manifest to S3.
 * Called before the Step Functions Distributed Map starts.
 *
 * Input: { jobId: string, filterRules?: FilterRule[] }
 * Output: { bucket: string, manifestS3Key: string, totalLeads: number, totalBatches: number, jobId: string }
 */

import { Client } from 'pg';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({});

const DATABASE_URL = process.env.DATABASE_URL!;
const CAMPAIGN_DATA_BUCKET = process.env.CAMPAIGN_DATA_BUCKET!;
const BATCH_SIZE = 250; // Leads per scrape batch

interface PrepareInput {
  jobId: string;
  filterRules?: Array<{
    field: string;
    operator: 'EXISTS' | 'NOT_EXISTS' | 'EQUALS' | 'NOT_EQUALS';
    value?: string;
  }>;
}

interface PrepareOutput {
  bucket: string;
  manifestS3Key: string;
  totalLeads: number;
  totalBatches: number;
  jobId: string;
}

export async function handler(event: PrepareInput): Promise<PrepareOutput> {
  console.log('PrepareScrape input:', JSON.stringify(event));

  const { jobId } = event;
  if (!jobId) throw new Error('jobId is required');

  // Connect to Postgres
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    // Query leads needing scrape (have website, not yet scraped)
    const result = await client.query<{ id: string; place_id: string; website: string }>(
      `SELECT id, place_id, website FROM leads
       WHERE website IS NOT NULL
         AND web_scraped_at IS NULL
       ORDER BY created_at ASC`
    );

    const leads = result.rows;
    console.log(`Found ${leads.length} leads needing scrape`);

    if (leads.length === 0) {
      const manifestS3Key = `jobs/${jobId}/batch-manifest.json`;
      await s3Client.send(new PutObjectCommand({
        Bucket: CAMPAIGN_DATA_BUCKET,
        Key: manifestS3Key,
        Body: JSON.stringify([]),
        ContentType: 'application/json',
      }));

      return { bucket: CAMPAIGN_DATA_BUCKET, manifestS3Key, totalLeads: 0, totalBatches: 0, jobId };
    }

    // Split into batches and write to S3
    const totalBatches = Math.ceil(leads.length / BATCH_SIZE);
    const batchReferences = [];

    for (let i = 0; i < totalBatches; i++) {
      const batchItems = leads.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
      const batchS3Key = `jobs/${jobId}/batches/batch-${String(i).padStart(4, '0')}.json`;

      await s3Client.send(new PutObjectCommand({
        Bucket: CAMPAIGN_DATA_BUCKET,
        Key: batchS3Key,
        Body: JSON.stringify(batchItems),
        ContentType: 'application/json',
      }));

      batchReferences.push({
        batchS3Key,
        batchIndex: i,
        itemCount: batchItems.length,
        jobId,
      });
    }

    // Write manifest (Distributed Map reads this)
    const manifestS3Key = `jobs/${jobId}/batch-manifest.json`;
    await s3Client.send(new PutObjectCommand({
      Bucket: CAMPAIGN_DATA_BUCKET,
      Key: manifestS3Key,
      Body: JSON.stringify(batchReferences),
      ContentType: 'application/json',
    }));

    console.log(`Wrote ${totalBatches} batch files + manifest`);

    return {
      bucket: CAMPAIGN_DATA_BUCKET,
      manifestS3Key,
      totalLeads: leads.length,
      totalBatches,
      jobId,
    };
  } finally {
    await client.end();
  }
}
