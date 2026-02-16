/**
 * Prepare Scrape Lambda
 *
 * Creates a Job record, queries Postgres for leads that need web scraping,
 * writes batch manifest to S3. Called before the Step Functions Distributed Map starts.
 *
 * Input: { jobId?: string, campaignId?: string, filterRules?: FilterRule[] }
 * Output: { bucket: string, manifestS3Key: string, totalLeads: number, totalBatches: number, jobId: string }
 */

import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { Client } from 'pg';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// Cached outside handler for warm invocations
const secretsManager = new SecretsManagerClient({});
const s3Client = new S3Client({});
let cachedDatabaseUrl: string | null = null;
let pgClient: Client | null = null;

const CAMPAIGN_DATA_BUCKET = process.env.CAMPAIGN_DATA_BUCKET!;

async function getDatabaseUrl(): Promise<string> {
  if (cachedDatabaseUrl) return cachedDatabaseUrl;
  const secretArn = process.env.DATABASE_SECRET_ARN;
  const host = process.env.DATABASE_HOST;
  if (!secretArn || !host) {
    throw new Error('DATABASE_SECRET_ARN and DATABASE_HOST are required');
  }
  const res = await secretsManager.send(new GetSecretValueCommand({ SecretId: secretArn }));
  const secret = JSON.parse(res.SecretString!);
  const { username, password, dbname } = secret;
  const port = secret.port ?? 5432;
  cachedDatabaseUrl = `postgresql://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}:${port}/${dbname}?sslmode=require`;
  return cachedDatabaseUrl;
}

async function getPgClient(): Promise<Client> {
  if (pgClient) return pgClient;
  const url = await getDatabaseUrl();
  pgClient = new Client({ connectionString: url });
  await pgClient.connect();
  return pgClient;
}
const BATCH_SIZE = 250; // Leads per scrape batch

interface PrepareInput {
  jobId?: string;
  campaignId?: string;
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

  const client = await getPgClient();

  let jobId = event.jobId;
  if (!jobId) {
    const jobResult = await client.query(
      `INSERT INTO jobs (id, campaign_id, type, status, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, 'prepare_scrape', 'running', NOW(), NOW())
       RETURNING id`,
      [event.campaignId ?? null]
    );
    jobId = jobResult.rows[0].id;
    console.log('Created job:', jobId);
  }

  try {
    // Query leads needing scrape (have website, not yet scraped)
    const result = await client.query<{ id: string; place_id: string; website: string; phone: string | null }>(
      `SELECT id, place_id, website, phone FROM leads
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
      await client.query(
        `UPDATE jobs SET status = 'completed', completed_at = NOW(), updated_at = NOW() WHERE id = $1`,
        [jobId]
      );
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

    await client.query(
      `UPDATE jobs SET status = 'completed', completed_at = NOW(), metadata = $1, updated_at = NOW() WHERE id = $2`,
      [JSON.stringify({ totalLeads: leads.length, totalBatches }), jobId]
    );

    return {
      bucket: CAMPAIGN_DATA_BUCKET,
      manifestS3Key,
      totalLeads: leads.length,
      totalBatches,
      jobId,
    };
  } catch (err) {
    await client.query(
      `UPDATE jobs SET status = 'failed', completed_at = NOW(), error_message = $1, updated_at = NOW() WHERE id = $2`,
      [err instanceof Error ? err.message : String(err), jobId]
    );
    throw err;
  }
  // Do not end() - keep connection warm for next invocation
}
