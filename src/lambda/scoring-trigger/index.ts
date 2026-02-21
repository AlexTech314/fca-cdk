/**
 * Scoring Trigger Lambda
 *
 * Consumes ScoringQueue (batch 50). Writes batch to S3, creates FargateTask record,
 * runs Scoring Fargate task. maxConcurrency: 2 (AWS minimum) limits concurrent scoring tasks.
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
const SCORING_TASK_DEF_ARN = process.env.SCORING_TASK_DEF_ARN!;
const SUBNETS = (process.env.SUBNETS || '').split(',').filter(Boolean);
const SECURITY_GROUPS = (process.env.SECURITY_GROUPS || '').split(',').filter(Boolean);
const CAMPAIGN_DATA_BUCKET = process.env.CAMPAIGN_DATA_BUCKET!;

interface BatchItem {
  lead_id: string;
  place_id: string;
}

export async function handler(event: SQSEvent): Promise<void> {
  const recordCount = event.Records?.length ?? 0;
  console.log(`ScoringTrigger received ${recordCount} message(s) from ScoringQueue`);

  if (recordCount === 0) {
    return;
  }

  const batch: BatchItem[] = [];
  for (const r of event.Records as SQSRecord[]) {
    try {
      const body = JSON.parse(r.body);
      const leadId = body.lead_id;
      const placeId = body.place_id ?? '';
      if (!leadId) continue;
      batch.push({ lead_id: leadId, place_id: placeId });
    } catch {
      // skip malformed messages
    }
  }

  if (batch.length === 0) {
    console.log('No valid messages in batch, skipping');
    return;
  }

  console.log(`Processing ${batch.length} leads for scoring`);

  const prisma = await getDb();

  const batchId = randomUUID();
  const batchS3Key = `scoring-batches/${batchId}.json`;

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
      type: 'ai_scoring',
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
        taskDefinition: SCORING_TASK_DEF_ARN,
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
              name: 'score',
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
      console.log(`Started scoring Fargate task ${task.id}, ECS task: ${taskArn}`);
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
