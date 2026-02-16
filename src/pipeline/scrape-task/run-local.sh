#!/bin/bash
# Local test script for scrape-task (Postgres + S3 batch mode)
# Usage: ./run-local.sh [batchS3Key]
#
# Requires: Run prepare-scrape first to create batches, or upload a test batch to S3.
# Batch format: [{ "id": "lead-uuid", "place_id": "ChIJ...", "website": "https://..." }]
#
# Examples:
#   BATCH_S3_KEY="jobs/<jobId>/batches/batch-0000.json" ./run-local.sh
#   DATABASE_SECRET_ARN="arn:..." DATABASE_HOST="..." BATCH_S3_KEY="..." ./run-local.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Configuration - update these for your environment
DATABASE_SECRET_ARN="${DATABASE_SECRET_ARN}"
DATABASE_HOST="${DATABASE_HOST}"
CAMPAIGN_DATA_BUCKET="${CAMPAIGN_DATA_BUCKET:-alpha-app-campaigndatabucket2fed4f6d-sb8x41631s50}"
BATCH_S3_KEY="${BATCH_S3_KEY}"
AWS_REGION="${AWS_REGION:-us-east-1}"

if [ -z "$BATCH_S3_KEY" ]; then
  echo "Error: BATCH_S3_KEY is required. Run prepare-scrape first or set BATCH_S3_KEY to an S3 key with batch JSON."
  exit 1
fi

if [ -z "$DATABASE_SECRET_ARN" ] || [ -z "$DATABASE_HOST" ]; then
  echo "Error: DATABASE_SECRET_ARN and DATABASE_HOST are required."
  exit 1
fi

# Detect platform (arm64 for Apple Silicon, amd64 for Intel)
PLATFORM="linux/$(uname -m | sed 's/x86_64/amd64/' | sed 's/aarch64/arm64/')"
echo "Detected platform: $PLATFORM"

# Build the Docker image for the correct platform
echo "Building scrape-task Docker image..."
docker build --platform "$PLATFORM" -f Dockerfile.local -t scrape-task-local .

JOB_INPUT=$(cat <<EOF
{
  "jobId": "local-test-$(date +%s)",
  "batchS3Key": "$BATCH_S3_KEY",
  "batchIndex": 0,
  "maxPagesPerSite": 10,
  "fastMode": true
}
EOF
)

echo ""
echo "JOB_INPUT: $JOB_INPUT"
echo ""

# Run the container with AWS credentials from host
docker run --rm \
    --platform "$PLATFORM" \
    -e AWS_REGION="$AWS_REGION" \
    -e AWS_DEFAULT_REGION="$AWS_REGION" \
    -e DATABASE_SECRET_ARN="$DATABASE_SECRET_ARN" \
    -e DATABASE_HOST="$DATABASE_HOST" \
    -e CAMPAIGN_DATA_BUCKET="$CAMPAIGN_DATA_BUCKET" \
    -e JOB_INPUT="$JOB_INPUT" \
    -v "$HOME/.aws:/root/.aws:ro" \
    scrape-task-local
