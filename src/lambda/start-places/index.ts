/**
 * Start Places Lambda
 *
 * Creates a Job record, runs the places Fargate task.
 * Invoked by API when user starts a campaign run.
 *
 * Input: { campaignId, campaignRunId, queriesS3Key, skipCachedSearches?, maxResultsPerSearch? }
 */

import { ECSClient, RunTaskCommand } from '@aws-sdk/client-ecs';
import { bootstrapDatabaseUrl, prisma } from '@fca/db';

const ecsClient = new ECSClient({});

const CLUSTER_ARN = process.env.CLUSTER_ARN!;
const PLACES_TASK_DEF_ARN = process.env.PLACES_TASK_DEF_ARN!;
const SUBNETS = (process.env.SUBNETS || '').split(',').filter(Boolean);
const SECURITY_GROUPS = (process.env.SECURITY_GROUPS || '').split(',').filter(Boolean);

interface StartPlacesInput {
  campaignId: string;
  campaignRunId: string;
  queriesS3Key: string;
  skipCachedSearches?: boolean;
  maxResultsPerSearch?: number;
  maxTotalRequests?: number;
}

export async function handler(event: StartPlacesInput): Promise<{ jobId: string; taskArn?: string }> {
  await bootstrapDatabaseUrl();
  console.log('StartPlaces input:', JSON.stringify(event));

  const { campaignId, campaignRunId, queriesS3Key, skipCachedSearches, maxResultsPerSearch, maxTotalRequests } = event;
  if (!campaignId || !campaignRunId || !queriesS3Key) {
    throw new Error('campaignId, campaignRunId, and queriesS3Key are required');
  }

  try {
    const job = await prisma.job.create({
      data: {
        campaignId,
        campaignRunId,
        type: 'places_search',
        status: 'running',
      },
    });
    const jobId = job.id;

    const jobInput = JSON.stringify({
      jobId,
      campaignId,
      campaignRunId,
      searchesS3Key: queriesS3Key,
      skipCachedSearches: skipCachedSearches ?? false,
      maxResultsPerSearch: maxResultsPerSearch ?? 60,
      maxTotalRequests: maxTotalRequests ?? undefined,
    });

    let runResult;
    try {
      runResult = await ecsClient.send(
        new RunTaskCommand({
          cluster: CLUSTER_ARN,
          taskDefinition: PLACES_TASK_DEF_ARN,
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
                name: 'places',
                environment: [
                  { name: 'JOB_INPUT', value: jobInput },
                ],
              },
            },
          },
        })
      );
    } catch (ecsErr) {
      const msg = ecsErr instanceof Error ? ecsErr.message : String(ecsErr);
      await prisma.job.update({
        where: { id: jobId },
        data: { status: 'failed', completedAt: new Date(), errorMessage: msg },
      });
      throw new Error(`ECS RunTask failed: ${msg}`);
    }

    const taskArn = runResult.tasks?.[0]?.taskArn;
    const failures = runResult.failures ?? [];
    if (failures.length > 0 && !taskArn) {
      const msg = failures.map((f) => f.reason ?? 'Unknown').join('; ');
      await prisma.job.update({
        where: { id: jobId },
        data: { status: 'failed', completedAt: new Date(), errorMessage: msg },
      });
      throw new Error(`ECS task launch failed: ${msg}`);
    }

    if (taskArn) {
      await prisma.job.update({
        where: { id: jobId },
        data: { externalId: taskArn },
      });
    }

    return { jobId, taskArn };
  } finally {
    // Keep Prisma connection alive for warm invocations
  }
}
