/**
 * Aggregate Scrape Lambda
 *
 * Called after Step Functions Distributed Map completes.
 * Reads result files from S3, aggregates metrics, updates CampaignRun via Prisma.
 */

import { S3Client, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { bootstrapDatabaseUrl, prisma } from '@fca/db';

const s3Client = new S3Client({});
const CAMPAIGN_DATA_BUCKET = process.env.CAMPAIGN_DATA_BUCKET!;

interface AggregateInput {
  jobId: string;
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
  await bootstrapDatabaseUrl();
  console.log('AggregateScrape input:', JSON.stringify(event));

  const { jobId } = event;
  if (!jobId) throw new Error('jobId is required');

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

  try {
    await prisma.campaignRun.update({
      where: { id: jobId },
      data: {
        leadsFound: { increment: totalSucceeded },
        errors: { increment: totalFailed },
        status: 'completed',
        completedAt: new Date(),
      },
    });
  } catch (e) {
    console.warn('Failed to update campaign run metrics:', e);
  }

  return { jobId, totalProcessed, totalFailed, totalSucceeded };
}
