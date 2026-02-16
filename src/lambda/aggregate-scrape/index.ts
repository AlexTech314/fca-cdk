/**
 * Aggregate Scrape Lambda
 *
 * Called after Step Functions Distributed Map completes.
 * Reads result files from S3, aggregates metrics, updates CampaignRun.
 */

import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { S3Client, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { Client } from 'pg';

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

interface AggregateInput {
  jobId: string;
  // ResultWriterV2 output reference
  ResultWriterDetails?: {
    Bucket: string;
    Key: string;
  };
}

interface AggregateOutput {
  jobId: string;
  totalProcessed: number;
  totalFailed: number;
  totalSucceeded: number;
}

export async function handler(event: AggregateInput): Promise<AggregateOutput> {
  console.log('AggregateScrape input:', JSON.stringify(event));

  const { jobId } = event;
  if (!jobId) throw new Error('jobId is required');

  // List scrape result files
  const prefix = `jobs/scrape-results/`;
  let totalProcessed = 0;
  let totalFailed = 0;
  let totalSucceeded = 0;

  try {
    const listResult = await s3Client.send(new ListObjectsV2Command({
      Bucket: CAMPAIGN_DATA_BUCKET,
      Prefix: prefix,
    }));

    const resultFiles = listResult.Contents || [];
    console.log(`Found ${resultFiles.length} result files`);

    for (const file of resultFiles) {
      if (!file.Key) continue;
      try {
        const getResult = await s3Client.send(new GetObjectCommand({
          Bucket: CAMPAIGN_DATA_BUCKET,
          Key: file.Key,
        }));
        const body = await getResult.Body?.transformToString();
        if (body) {
          const results = JSON.parse(body);
          // Count successes and failures from Distributed Map results
          if (Array.isArray(results)) {
            for (const r of results) {
              totalProcessed++;
              if (r.Status === 'FAILED') totalFailed++;
              else totalSucceeded++;
            }
          }
        }
      } catch (e) {
        console.warn(`Failed to read result file ${file.Key}:`, e);
        totalFailed++;
      }
    }
  } catch (e) {
    console.error('Failed to list result files:', e);
  }

  console.log(`Aggregate: ${totalProcessed} processed, ${totalSucceeded} succeeded, ${totalFailed} failed`);

  // Update campaign_run metrics if we can find the run
  const client = await getPgClient();
  try {
    // The jobId maps to a campaign run -- update its metrics
    // This is a best-effort update
    await client.query(
      `UPDATE campaign_runs SET
         leads_found = leads_found + $1,
         errors = errors + $2,
         status = 'completed',
         completed_at = NOW()
       WHERE id = $3`,
      [totalSucceeded, totalFailed, jobId]
    );
  } catch (e) {
    console.warn('Failed to update campaign run metrics:', e);
  }
  // Do not end() - keep connection warm for next invocation

  return { jobId, totalProcessed, totalFailed, totalSucceeded };
}
