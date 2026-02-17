/**
 * Prepare Scrape Lambda
 *
 * Creates a Job record, queries Postgres for leads that need web scraping,
 * writes batch manifest to S3. Called before the Step Functions Distributed Map starts.
 *
 * Input: { jobId?: string, campaignId?: string, filterRules?: FilterRule[] }
 * Output: { bucket: string, manifestS3Key: string, totalLeads: number, totalBatches: number, jobId: string }
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { bootstrapDatabaseUrl, prisma } from '@fca/db';

const s3Client = new S3Client({});
const CAMPAIGN_DATA_BUCKET = process.env.CAMPAIGN_DATA_BUCKET!;
const BATCH_SIZE = 250;

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
  await bootstrapDatabaseUrl();
  console.log('PrepareScrape input:', JSON.stringify(event));

  let jobId = event.jobId;
  if (!jobId) {
    const job = await prisma.job.create({
      data: {
        campaignId: event.campaignId ?? null,
        type: 'prepare_scrape',
        status: 'running',
      },
    });
    jobId = job.id;
    console.log('Created job:', jobId);
  }

  try {
    const leads = await prisma.lead.findMany({
      where: {
        website: { not: null },
        webScrapedAt: null,
      },
      select: { id: true, placeId: true, website: true, phone: true },
      orderBy: { createdAt: 'asc' },
    });

    console.log(`Found ${leads.length} leads needing scrape`);

    if (leads.length === 0) {
      const manifestS3Key = `jobs/${jobId}/batch-manifest.json`;
      await s3Client.send(new PutObjectCommand({
        Bucket: CAMPAIGN_DATA_BUCKET,
        Key: manifestS3Key,
        Body: JSON.stringify([]),
        ContentType: 'application/json',
      }));
      await prisma.job.update({
        where: { id: jobId },
        data: { status: 'completed', completedAt: new Date() },
      });
      return { bucket: CAMPAIGN_DATA_BUCKET, manifestS3Key, totalLeads: 0, totalBatches: 0, jobId };
    }

    const totalBatches = Math.ceil(leads.length / BATCH_SIZE);
    const batchReferences = [];

    for (let i = 0; i < totalBatches; i++) {
      const batchItems = leads.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE).map(l => ({
        id: l.id,
        place_id: l.placeId,
        website: l.website,
        phone: l.phone,
      }));
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

    const manifestS3Key = `jobs/${jobId}/batch-manifest.json`;
    await s3Client.send(new PutObjectCommand({
      Bucket: CAMPAIGN_DATA_BUCKET,
      Key: manifestS3Key,
      Body: JSON.stringify(batchReferences),
      ContentType: 'application/json',
    }));

    console.log(`Wrote ${totalBatches} batch files + manifest`);

    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'completed',
        completedAt: new Date(),
        metadata: { totalLeads: leads.length, totalBatches },
      },
    });

    return { bucket: CAMPAIGN_DATA_BUCKET, manifestS3Key, totalLeads: leads.length, totalBatches, jobId };
  } catch (err) {
    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'failed',
        completedAt: new Date(),
        errorMessage: err instanceof Error ? err.message : String(err),
      },
    });
    throw err;
  }
}
