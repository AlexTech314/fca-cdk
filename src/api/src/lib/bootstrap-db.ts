import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

/**
 * Bootstrap DATABASE_URL from Secrets Manager when running in Fargate.
 * If DATABASE_URL is already set (local dev), no-op.
 */
export async function bootstrapDatabaseUrl(): Promise<void> {
  if (process.env.DATABASE_URL) return;

  const secretArn = process.env.DATABASE_SECRET_ARN;
  const host = process.env.DATABASE_HOST;
  if (!secretArn || !host) {
    throw new Error('Set DATABASE_URL or (DATABASE_SECRET_ARN + DATABASE_HOST)');
  }

  const client = new SecretsManagerClient({});
  const res = await client.send(new GetSecretValueCommand({ SecretId: secretArn }));
  const { username, password, dbname, port } = JSON.parse(res.SecretString!);

  process.env.DATABASE_URL =
    `postgresql://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}:${port ?? 5432}/${dbname}?sslmode=require`;
}
