/**
 * Reset Script -- wipe seed data and re-seed.
 *
 * Usage:
 *   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/fca_db npx ts-node src/reset.ts
 *
 * With Cognito (local):
 *   COGNITO_USER_POOL_ID=<pool_id> COGNITO_ENDPOINT=http://localhost:9229 \
 *   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/fca_db npm run seed:reset
 */

import { PrismaClient } from '@prisma/client';
import { wipeSeed, runSeed } from './seed';
import { seedCognitoUser } from './cognito';

async function main() {
  const prisma = new PrismaClient();
  try {
    console.log('Wiping seed data...');
    await wipeSeed(prisma);
    console.log('Running seed...');
    await runSeed(prisma);

    const cognitoPoolId = process.env.COGNITO_USER_POOL_ID;
    if (cognitoPoolId) {
      await seedCognitoUser({
        userPoolId: cognitoPoolId,
        email: 'alest314@gmail.com',
        password: 'Admin123!',
        groups: ['admin'],
        endpoint: process.env.COGNITO_ENDPOINT,
        region: process.env.AWS_REGION || 'us-east-2',
      });
    }

    console.log('Done!');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
