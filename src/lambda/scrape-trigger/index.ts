/**
 * Scrape Trigger Lambda
 *
 * Consumes ScrapeQueue (batch 50). Parses messages into batch of leads,
 * writes batch to S3, creates FargateTask record, runs Scrape Fargate task directly.
 */

import { SQSEvent, SQSRecord } from 'aws-lambda';
import { ECSClient, RunTaskCommand } from '@aws-sdk/client-ecs';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { bootstrapDatabaseUrl } from '@fca/db';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

let _prisma: PrismaClient | undefined;
async function getDb(): Promise<PrismaClient> {
  if (!_prisma) {
    await bootstrapDatabaseUrl();
    _prisma = new PrismaClient();
  }
  return _prisma;
}

const ecsClient = new ECSClient({});
const s3Client = new S3Client({});

const CLUSTER_ARN = process.env.CLUSTER_ARN!;
const SCRAPE_TASK_DEF_ARN = process.env.SCRAPE_TASK_DEF_ARN!;
const SUBNETS = (process.env.SUBNETS || '').split(',').filter(Boolean);
const SECURITY_GROUPS = (process.env.SECURITY_GROUPS || '').split(',').filter(Boolean);
const CAMPAIGN_DATA_BUCKET = process.env.CAMPAIGN_DATA_BUCKET!;

interface BatchLead {
  id: string;
  place_id: string;
  website: string;
  phone?: string | null;
}

export async function handler(event: SQSEvent): Promise<void> {
  const recordCount = event.Records?.length ?? 0;
  console.log(`ScrapeTrigger received ${recordCount} message(s) from ScrapeQueue`);

  if (recordCount === 0) {
    return;
  }

  const batch: BatchLead[] = [];
  const skippedLeadIds: string[] = [];
  for (const r of event.Records as SQSRecord[]) {
    try {
      const body = JSON.parse(r.body);
      const leadId = body.lead_id;
      const placeId = body.place_id ?? '';
      const website = body.website ?? '';

      if (!leadId) continue;
      if (!website || typeof website !== 'string' || website.trim() === '') {
        skippedLeadIds.push(leadId);
        continue;
      }

      batch.push({
        id: leadId,
        place_id: placeId,
        website: website.trim(),
      });
    } catch {
      // skip malformed messages
    }
  }

  // Reset pipeline status for leads that have no website (stuck prevention)
  if (skippedLeadIds.length > 0) {
    const prismaEarly = await getDb();
    await prismaEarly.lead.updateMany({
      where: { id: { in: skippedLeadIds }, pipelineStatus: 'queued_for_scrape' },
      data: { pipelineStatus: 'scrape_failed', scrapeError: 'No website URL available' },
    });
    console.log(`Marked ${skippedLeadIds.length} lead(s) with no website as scrape_failed`);
  }

  if (batch.length === 0) {
    console.log('No leads with website in batch, skipping');
    return;
  }

  console.log(`Processing ${batch.length} leads with websites`);

  const prisma = await getDb();

  const batchId = randomUUID();
  const batchS3Key = `scrape-batches/${batchId}.json`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: CAMPAIGN_DATA_BUCKET,
      Key: batchS3Key,
      Body: JSON.stringify(batch),
      ContentType: 'application/json',
    })
  );

  const task = await prisma.fargateTask.create({
    data: {
      type: 'web_scrape',
      status: 'running',
      startedAt: new Date(),
    },
  });

  const jobInput = JSON.stringify({
    batchS3Key,
    taskId: task.id,
  });

  try {
    const runResult = await ecsClient.send(
      new RunTaskCommand({
        cluster: CLUSTER_ARN,
        taskDefinition: SCRAPE_TASK_DEF_ARN,
        launchType: 'FARGATE',
        networkConfiguration: {
          awsvpcConfiguration: {
            subnets: SUBNETS,
            securityGroups: SECURITY_GROUPS,
            assignPublicIp: 'DISABLED',
          },
        },
        overrides: {
          containerOverrides: [
            {
              name: 'scrape',
              environment: [{ name: 'JOB_INPUT', value: jobInput }],
            },
          ],
        },
      })
    );

    const taskArn = runResult.tasks?.[0]?.taskArn;
    const failures = runResult.failures ?? [];

    if (failures.length > 0 && !taskArn) {
      const msg = failures.map((f) => f.reason ?? 'Unknown').join('; ');
      await prisma.fargateTask.update({
        where: { id: task.id },
        data: { status: 'failed', completedAt: new Date(), errorMessage: msg },
      });
      throw new Error(`ECS task launch failed: ${msg}`);
    }

    if (taskArn) {
      await prisma.fargateTask.update({
        where: { id: task.id },
        data: { taskArn },
      });
      console.log(`Started scrape Fargate task ${task.id}, ECS task: ${taskArn}`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await prisma.fargateTask.update({
      where: { id: task.id },
      data: { status: 'failed', completedAt: new Date(), errorMessage: msg },
    });
    throw err;
  }
}
