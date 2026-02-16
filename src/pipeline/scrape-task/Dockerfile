# Use Puppeteer base image with Chromium pre-installed
# BASE_IMAGE: pass at build time for ECR pull-through cache
# Default ghcr.io for local builds without --build-arg
ARG BASE_IMAGE=ghcr.io/puppeteer/puppeteer:24.0.0
FROM ${BASE_IMAGE}

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json tsconfig.json ./

# Install dependencies (runs as pptruser, not root)
RUN npm ci

# Copy all source files (including subdirectories)
COPY *.ts ./
COPY extractors/ ./extractors/
COPY scraper/ ./scraper/
COPY storage/ ./storage/
COPY utils/ ./utils/

RUN npm run build

# Run the task
CMD ["node", "dist/index.js"]
