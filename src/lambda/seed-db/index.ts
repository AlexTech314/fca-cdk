/**
 * Seed DB Lambda
 *
 * Docker-based Lambda for cloud database seeding.
 * Supports actions: seed, wipe, reset (wipe+migrate+seed), migrate, cognito-seed.
 *
 * Invoke:
 *   aws lambda invoke --function-name <arn> --payload '{"action":"reset"}' /dev/stdout
 */

import { bootstrapDatabaseUrl } from '@fca/db';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import { existsSync, readdirSync } from 'fs';

type SeedAction = 'seed' | 'wipe' | 'reset' | 'migrate' | 'cognito-seed' | 'configure-bridge';

interface SeedEvent {
  action?: SeedAction;
  bridgeLambdaArn?: string;
  awsRegion?: string;
}

const COGNITO_SEED_USERS = [
  'alest314@gmail.com',
  'kwegen@flatironscap.com',
  'mallen@flatironscap.com',
  'cslivocka@flatironscap.com',
];

function runCommand(cmd: string, cwd: string): string {
  console.log(`[exec] ${cmd}  (cwd: ${cwd})`);
  try {
    const output = execSync(cmd, {
      cwd,
      encoding: 'utf-8',
      timeout: 120_000,
      env: { ...process.env },
    });
    if (output) console.log(`[stdout] ${output}`);
    return output;
  } catch (err: any) {
    console.error(`[exec FAILED] exit code: ${err.status}`);
    if (err.stdout) console.error(`[stdout] ${err.stdout}`);
    if (err.stderr) console.error(`[stderr] ${err.stderr}`);
    throw new Error(`Command failed (exit ${err.status}): ${cmd}\nstdout: ${err.stdout}\nstderr: ${err.stderr}`);
  }
}

async function runCognitoSeed(skipIfExists: boolean): Promise<void> {
  const cognitoPoolId = process.env.COGNITO_USER_POOL_ID;
  if (!cognitoPoolId) {
    console.log('Cognito: COGNITO_USER_POOL_ID not set, skipping');
    return;
  }
  const { seedCognitoUser } = require('@fca/seed');
  for (const email of COGNITO_SEED_USERS) {
    await seedCognitoUser({
      userPoolId: cognitoPoolId,
      email,
      password: 'Admin123!',
      groups: ['admin'],
      skipIfExists,
    });
  }
}

export async function handler(event: SeedEvent): Promise<{ status: string; action: string; message: string; details?: string }> {
  const action = event.action ?? 'reset';
  console.log(`=== seed-db lambda START === action=${action}`);
  console.log(`Node version: ${process.version}`);
  console.log(`Working directory: ${process.cwd()}`);

  // Diagnostic: verify critical paths exist
  const dbPkgPath = '/packages/db';
  const seedPkgPath = '/packages/seed';
  const prismaDir = `${dbPkgPath}/prisma`;
  const migrationsDir = `${prismaDir}/migrations`;
  const schemaPath = `${prismaDir}/schema.prisma`;

  console.log(`[diag] /packages/db exists: ${existsSync(dbPkgPath)}`);
  console.log(`[diag] /packages/seed exists: ${existsSync(seedPkgPath)}`);
  console.log(`[diag] prisma dir exists: ${existsSync(prismaDir)}`);
  console.log(`[diag] schema.prisma exists: ${existsSync(schemaPath)}`);
  console.log(`[diag] migrations dir exists: ${existsSync(migrationsDir)}`);

  if (existsSync(migrationsDir)) {
    const migrations = readdirSync(migrationsDir).filter((f) => f !== 'migration_lock.toml');
    console.log(`[diag] ${migrations.length} migrations found: ${migrations.join(', ')}`);
  }

  // Verify prisma CLI is available
  try {
    const prismaVersion = runCommand('npx prisma --version', dbPkgPath);
    console.log(`[diag] prisma version: ${prismaVersion.trim()}`);
  } catch (e: any) {
    console.error(`[diag] prisma CLI not available: ${e.message}`);
  }

  const needsDb = action !== 'cognito-seed';
  if (needsDb) {
    console.log('Bootstrapping DATABASE_URL...');
    await bootstrapDatabaseUrl();
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error('DATABASE_URL is not set after bootstrapDatabaseUrl()');
    }
    // Log masked URL (hide password)
    const masked = dbUrl.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
    console.log(`[diag] DATABASE_URL: ${masked}`);
  }

  // Run migrations (idempotent)
  if (action === 'migrate' || action === 'reset') {
    console.log('=== MIGRATE START ===');
    const output = runCommand('npx prisma migrate deploy', dbPkgPath);
    console.log('=== MIGRATE COMPLETE ===');
    console.log(output);
  }

  // Configure Bridge Lambda ARN for PG triggers (invoked by LeadGenPipelineStack after deploy)
  if (action === 'configure-bridge') {
    const bridgeLambdaArn = event.bridgeLambdaArn;
    const awsRegion = event.awsRegion;
    if (!bridgeLambdaArn || !awsRegion) {
      throw new Error('configure-bridge requires bridgeLambdaArn and awsRegion in payload');
    }
    console.log('=== CONFIGURE BRIDGE START ===');
    const prisma = new PrismaClient({ log: ['warn', 'error'] });
    try {
      const sanitizedArn = bridgeLambdaArn.replace(/'/g, "''");
      const sanitizedRegion = awsRegion.replace(/'/g, "''");
      await prisma.$executeRawUnsafe(
        `ALTER DATABASE fca_db SET app.bridge_lambda_arn = '${sanitizedArn}'`
      );
      await prisma.$executeRawUnsafe(
        `ALTER DATABASE fca_db SET app.aws_region = '${sanitizedRegion}'`
      );
      console.log(`Set app.bridge_lambda_arn and app.aws_region for fca_db`);
    } finally {
      await prisma.$disconnect();
    }
    console.log('=== CONFIGURE BRIDGE COMPLETE ===');
  }

  // Seed/wipe operations need Prisma client + seed module
  if (action === 'wipe' || action === 'seed' || action === 'reset') {
    console.log('Creating PrismaClient...');
    const prisma = new PrismaClient({ log: ['warn', 'error'] });
    try {
      console.log('Testing DB connection...');
      await prisma.$queryRaw`SELECT 1`;
      console.log('DB connection OK.');

      const { wipeSeed, runSeed } = require('@fca/seed');

      if (action === 'wipe' || action === 'reset') {
        console.log('=== WIPE START ===');
        await wipeSeed(prisma);
        console.log('=== WIPE COMPLETE ===');
      }

      if (action === 'seed' || action === 'reset') {
        console.log('=== SEED START ===');
        await runSeed(prisma);
        console.log('=== SEED COMPLETE ===');
      }
    } catch (err: any) {
      console.error(`[seed/wipe FAILED] ${err.constructor?.name}: ${err.message}`);
      if (err.code) console.error(`[prisma error code] ${err.code}`);
      if (err.meta) console.error(`[prisma meta] ${JSON.stringify(err.meta)}`);
      throw err;
    } finally {
      await prisma.$disconnect();
      console.log('PrismaClient disconnected.');
    }
  }

  if (action === 'cognito-seed') {
    await runCognitoSeed(true);
  } else if (action === 'seed' || action === 'reset') {
    await runCognitoSeed(true);
  }

  console.log(`=== seed-db lambda DONE === action=${action}`);
  return { status: 'ok', action, message: `Completed: ${action}` };
}
