#!/bin/bash
set -e

echo "=== FCA API Docker Entrypoint ==="
echo "Waiting for database to be ready..."

# Wait for PostgreSQL to accept connections
max_attempts=30
attempt=0
until npx prisma db push --skip-generate --accept-data-loss 2>&1 | grep -q "Your database is now in sync\|already in sync"; do
  attempt=$((attempt + 1))
  if [ $attempt -ge $max_attempts ]; then
    echo "ERROR: Database not ready after $max_attempts attempts"
    exit 1
  fi
  echo "Database not ready (attempt $attempt/$max_attempts), retrying in 2 seconds..."
  sleep 2
done

echo "Database connection established!"

# Apply schema changes (development mode uses db push)
echo "Applying Prisma schema..."
npx prisma db push --skip-generate

# Check if we should seed by using a small Node script
echo "Checking if database needs seeding..."

SHOULD_SEED=$(node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const count = await prisma.tombstone.count();
    console.log(count === 0 ? 'yes' : 'no');
  } catch (e) {
    console.log('yes');
  } finally {
    await prisma.\$disconnect();
  }
}
check();
")

if [ "$SHOULD_SEED" = "yes" ]; then
  echo "Database is empty, running seed..."
  if npm run db:seed; then
    echo "Seeding complete!"
  else
    echo "ERROR: Seeding failed! Check the logs above."
    exit 1
  fi
else
  echo "Database already seeded, skipping..."
fi

echo "=== Starting development server ==="
exec npm run dev
