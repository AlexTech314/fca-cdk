# Build context: src/
# Use Puppeteer base image with Chromium pre-installed
# BASE_IMAGE: pass at build time for ECR pull-through cache
# Default ghcr.io for local builds without --build-arg
ARG BASE_IMAGE=ghcr.io/puppeteer/puppeteer:24.0.0

# Stage 1: Build shared db package
FROM node:20-slim AS db-builder
WORKDIR /app/packages/db
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY packages/db/package*.json ./
RUN npm ci
COPY packages/db/prisma ./prisma/
RUN npx prisma generate
COPY packages/db/src ./src/
COPY packages/db/tsconfig.json ./
RUN npx tsc

# Stage 2: Build scrape task on Puppeteer base
FROM ${BASE_IMAGE}
WORKDIR /app

# Copy db package
COPY --from=db-builder /app/packages/db /app/packages/db

# Copy package files and install
COPY pipeline/scrape-task/package*.json pipeline/scrape-task/tsconfig.json ./
RUN npm ci

# Copy all source files (including subdirectories)
COPY pipeline/scrape-task/*.ts ./
COPY pipeline/scrape-task/extractors/ ./extractors/
COPY pipeline/scrape-task/scraper/ ./scraper/
COPY pipeline/scrape-task/storage/ ./storage/
COPY pipeline/scrape-task/utils/ ./utils/

RUN npm run build

CMD ["node", "dist/index.js"]
