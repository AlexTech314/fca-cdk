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

type SeedAction = 'seed' | 'wipe' | 'reset' | 'migrate' | 'cognito-seed';

interface SeedEvent {
  action?: SeedAction;
}

const COGNITO_SEED_USERS = [
  'alest314@gmail.com',
  'kwegen@flatironscap.com',
  'mallen@flatironscap.com',
  'cslivocka@flatironscap.com',
];

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

export async function handler(event: SeedEvent): Promise<{ status: string; action: string; message: string }> {
  const action = event.action ?? 'reset';
  const needsDb = action !== 'cognito-seed';
  if (needsDb) {
    await bootstrapDatabaseUrl();
  }
  console.log(`seed-db: action=${action}`);

  // Run migrations (idempotent)
  if (action === 'migrate' || action === 'reset') {
    console.log('Running prisma migrate deploy...');
    execSync('npx prisma migrate deploy', {
      cwd: '/packages/db',
      stdio: 'inherit',
      env: { ...process.env },
    });
    console.log('Migrations complete.');
  }

  // Seed/wipe operations need Prisma client + seed module
  if (action === 'wipe' || action === 'seed' || action === 'reset') {
    const prisma = new PrismaClient();
    try {
      // Dynamic require since @fca/seed is a file: dependency
      const { wipeSeed, runSeed } = require('@fca/seed');

      if (action === 'wipe' || action === 'reset') {
        console.log('Wiping seed data...');
        await wipeSeed(prisma);
        console.log('Wipe complete.');
      }

      if (action === 'seed' || action === 'reset') {
        console.log('Running seed...');
        await runSeed(prisma);
        console.log('Seed complete.');
      }
    } finally {
      await prisma.$disconnect();
    }
  }

  if (action === 'cognito-seed') {
    await runCognitoSeed(true); // skip existing users
  } else if (action === 'seed' || action === 'reset') {
    await runCognitoSeed(true); // skip existing users (don't overwrite)
  }

  return { status: 'ok', action, message: `Completed: ${action}` };
}
