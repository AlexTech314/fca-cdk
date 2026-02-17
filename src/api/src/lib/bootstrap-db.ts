import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

/**
 * Bootstrap DATABASE_URL from Secrets Manager when running in Fargate.
 * If DATABASE_URL is already set (local dev), no-op.
 *
 * ECS injects the secret VALUE (JSON) when using ecs.Secret.fromSecretsManager.
 * Lambda/tasks may pass the ARN and fetch at runtime. Handle both.
 */
export async function bootstrapDatabaseUrl(): Promise<void> {
  if (process.env.DATABASE_URL) return;

  const secretInput = process.env.DATABASE_SECRET_ARN;
  const host = process.env.DATABASE_HOST;
  if (!secretInput || !host) {
    throw new Error('Set DATABASE_URL or (DATABASE_SECRET_ARN + DATABASE_HOST)');
  }

  let creds: { username: string; password: string; dbname: string; port?: number };
  const trimmed = secretInput.trim();

  if (trimmed.startsWith('{')) {
    // ECS injects the secret value (JSON) directly
    creds = JSON.parse(trimmed);
  } else if (trimmed.startsWith('arn:')) {
    // ARN passed — fetch from Secrets Manager
    const client = new SecretsManagerClient({});
    const res = await client.send(new GetSecretValueCommand({ SecretId: trimmed }));
    creds = JSON.parse(res.SecretString!);
  } else {
    throw new Error('DATABASE_SECRET_ARN must be JSON (from ECS) or an ARN (arn:aws:secretsmanager:...)');
  }

  const { username, password, dbname, port } = creds;
  process.env.DATABASE_URL =
    `postgresql://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}:${port ?? 5432}/${dbname}?sslmode=require`;
}
