/**
 * Seed DB Lambda
 *
 * Docker-based Lambda for cloud database seeding.
 * Supports actions: seed, wipe, reset (wipe+migrate+seed), migrate.
 *
 * Invoke:
 *   aws lambda invoke --function-name <arn> --payload '{"action":"reset"}' /dev/stdout
 */

import { bootstrapDatabaseUrl } from '@fca/db';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

type SeedAction = 'seed' | 'wipe' | 'reset' | 'migrate';

interface SeedEvent {
  action?: SeedAction;
}

export async function handler(event: SeedEvent): Promise<{ status: string; action: string; message: string }> {
  await bootstrapDatabaseUrl();
  const action = event.action ?? 'reset';
  console.log(`seed-db: action=${action}`);

  // Run migrations (idempotent)
  if (action === 'migrate' || action === 'reset') {
    console.log('Running prisma migrate deploy...');
    execSync('npx prisma migrate deploy', {
      cwd: '/app/packages/db',
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

  const cognitoPoolId = process.env.COGNITO_USER_POOL_ID;
  if (cognitoPoolId && (action === 'seed' || action === 'reset')) {
    const { seedCognitoUser } = require('@fca/seed');
    await seedCognitoUser({
      userPoolId: cognitoPoolId,
      email: 'alest314@gmail.com',
      password: 'Admin123!',
      groups: ['admin'],
    });
  }

  return { status: 'ok', action, message: `Completed: ${action}` };
}
