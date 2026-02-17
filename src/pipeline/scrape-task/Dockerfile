# Build context: src/
# Use Puppeteer base image with Chromium pre-installed
# BASE_IMAGE: pass at build time for ECR pull-through cache
# NODE_20_SLIM: pass at build time for ECR pull-through cache
ARG BASE_IMAGE=ghcr.io/puppeteer/puppeteer:24.0.0
ARG NODE_20_SLIM=node:20-slim

# Stage 1: Build shared db package
FROM ${NODE_20_SLIM} AS db-builder
WORKDIR /app/packages/db
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY packages/db/package*.json ./
RUN npm ci --ignore-scripts
COPY packages/db/prisma/schema.prisma ./prisma/
RUN npx prisma generate
COPY packages/db/src ./src/
COPY packages/db/tsconfig.json ./
RUN npx tsc

# Stage 2: Build scrape task on Puppeteer base
FROM ${BASE_IMAGE}
USER root
WORKDIR /app

# Copy db package
COPY --from=db-builder /app/packages/db /app/packages/db

# Copy package files and install (keep in subdirectory so file:../../packages/db resolves correctly)
COPY pipeline/scrape-task/package*.json pipeline/scrape-task/tsconfig.json ./pipeline/scrape-task/
RUN cd pipeline/scrape-task && npm ci --install-links --ignore-scripts
COPY --from=db-builder /app/packages/db/node_modules/.prisma pipeline/scrape-task/node_modules/.prisma/

# Copy all source files (including subdirectories)
COPY pipeline/scrape-task/*.ts ./pipeline/scrape-task/
COPY pipeline/scrape-task/extractors/ ./pipeline/scrape-task/extractors/
COPY pipeline/scrape-task/scraper/ ./pipeline/scrape-task/scraper/
COPY pipeline/scrape-task/storage/ ./pipeline/scrape-task/storage/
COPY pipeline/scrape-task/utils/ ./pipeline/scrape-task/utils/

RUN cd pipeline/scrape-task && npm run build

USER pptruser
WORKDIR /app/pipeline/scrape-task
CMD ["node", "dist/index.js"]
