#!/bin/bash
# Build all Docker images used by fca-cdk stacks.
# Same flags as manual test: --no-cache, platform, -t tag.
# Run from repo root.
# Continues on failure; reports pass/fail at end.

cd "$(dirname "$0")/.."
SRC="src"
FAILED=()

echo "=== Building all Docker images ==="

build_one() {
  local name="$1"
  local dockerfile="$2"
  local platform="$3"
  local tag="$4"
  local context="$5"
  shift 5
  local extra_args=("$@")

  echo "[$name] Building $tag..."
  if docker build --no-cache -f "$dockerfile" --platform "$platform" -t "$tag" "${extra_args[@]}" "$context"; then
    echo "[$name] OK"
    return 0
  else
    echo "[$name] FAILED"
    FAILED+=("$name")
    return 1
  fi
}

# 1. Bridge Lambda (arm64)
build_one "1/11" "$SRC/lambda/bridge/Dockerfile" linux/arm64 fca-bridge "$SRC"

# 2. Places task (arm64)
build_one "2/11" "$SRC/pipeline/places-task/Dockerfile" linux/arm64 fca-places "$SRC"

# 3. Start-places Lambda (arm64)
build_one "3/11" "$SRC/lambda/start-places/Dockerfile" linux/arm64 fca-start-places "$SRC"

# 4. Scrape task (amd64 - Puppeteer/Chromium)
build_one "4/11" "$SRC/pipeline/scrape-task/Dockerfile" linux/amd64 fca-scrape "$SRC"

# 5. Scrape trigger Lambda (arm64)
build_one "5/11" "$SRC/lambda/scrape-trigger/Dockerfile" linux/arm64 fca-scrape-trigger "$SRC"

# 6. Scoring task (arm64)
build_one "6/11" "$SRC/pipeline/scoring-task/Dockerfile" linux/arm64 fca-scoring "$SRC"

# 7. Scoring trigger Lambda (arm64)
build_one "7/11" "$SRC/lambda/scoring-trigger/Dockerfile" linux/arm64 fca-scoring-trigger "$SRC"

# 8. API (arm64)
build_one "8/11" "$SRC/api/Dockerfile" linux/arm64 fca-api "$SRC"

# 9. Seed-db Lambda (arm64)
build_one "9/11" "$SRC/lambda/seed-db/Dockerfile" linux/arm64 fca-seed-db "$SRC"

# 10. Flagship public (arm64)
build_one "10/11" "$SRC/flagship-ui/nextjs-web/Dockerfile.public" linux/arm64 fca-flagship-public "$SRC/flagship-ui/nextjs-web" --build-arg API_URL=http://localhost:3000/api

# 11. Flagship admin (arm64)
build_one "11/11" "$SRC/flagship-ui/nextjs-web/Dockerfile.admin" linux/arm64 fca-flagship-admin "$SRC/flagship-ui/nextjs-web" \
  --build-arg API_URL=http://localhost:3000/api \
  --build-arg NEXT_PUBLIC_COGNITO_USER_POOL_ID= \
  --build-arg NEXT_PUBLIC_COGNITO_CLIENT_ID= \
  --build-arg NEXT_PUBLIC_API_URL=/api

echo ""
if [ ${#FAILED[@]} -eq 0 ]; then
  echo "=== All 11 Docker images built successfully ==="
else
  echo "=== Build complete: ${#FAILED[@]} failed ==="
  echo "Failed: ${FAILED[*]}"
  echo "Note: apt-get GPG errors often indicate clock skew, proxy, or Docker env issues."
  exit 1
fi
