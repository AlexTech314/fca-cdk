/**
 * Start Places Lambda
 *
 * Creates a Job record, runs the places Fargate task.
 * Invoked by API when user starts a campaign run.
 *
 * Input: { campaignId, campaignRunId, queriesS3Key, skipCachedSearches?, maxResultsPerSearch? }
 */

import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { Client } from 'pg';
import { ECSClient, RunTaskCommand } from '@aws-sdk/client-ecs';

// Cached outside handler for warm invocations
const secretsManager = new SecretsManagerClient({});
const ecsClient = new ECSClient({});
let cachedDatabaseUrl: string | null = null;
let pgClient: Client | null = null;

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
}

export async function handler(event: StartPlacesInput): Promise<{ jobId: string; taskArn?: string }> {
  console.log('StartPlaces input:', JSON.stringify(event));

  const { campaignId, campaignRunId, queriesS3Key, skipCachedSearches, maxResultsPerSearch } = event;
  if (!campaignId || !campaignRunId || !queriesS3Key) {
    throw new Error('campaignId, campaignRunId, and queriesS3Key are required');
  }

  const client = await getPgClient();

  try {
    const jobResult = await client.query(
      `INSERT INTO jobs (id, campaign_id, campaign_run_id, type, status, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, 'places_search', 'running', NOW(), NOW())
       RETURNING id`,
      [campaignId, campaignRunId]
    );
    const jobId = jobResult.rows[0].id;

    const jobInput = JSON.stringify({
      jobId,
      campaignId,
      campaignRunId,
      searchesS3Key: queriesS3Key,
      skipCachedSearches: skipCachedSearches ?? false,
      maxResultsPerSearch: maxResultsPerSearch ?? 60,
    });

    const runResult = await ecsClient.send(
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
          ],
        },
      })
    );

    const taskArn = runResult.tasks?.[0]?.taskArn;
    if (taskArn) {
      await client.query(
        `UPDATE jobs SET external_id = $1, updated_at = NOW() WHERE id = $2`,
        [taskArn, jobId]
      );
    }

    return { jobId, taskArn };
  } finally {
    // Do not end() - keep connection warm for next invocation
  }
}
