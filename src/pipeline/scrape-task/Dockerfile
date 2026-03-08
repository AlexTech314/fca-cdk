# Build context: src/
# CloakBrowser stealth Chromium replaces stock Puppeteer/Chromium
# NODE_20_SLIM: pass at build time for ECR pull-through cache
ARG NODE_20_SLIM=node:24-slim

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

# Stage 2: Build scrape task with CloakBrowser
FROM ${NODE_20_SLIM}
USER root
WORKDIR /app

# Install Chromium runtime dependencies + curl for downloading CloakBrowser
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates curl \
    fonts-liberation libasound2 libatk-bridge2.0-0 libatk1.0-0 \
    libatspi2.0-0 libcups2 libdbus-1-3 libdrm2 libgbm1 libgtk-3-0 \
    libnspr4 libnss3 libxcomposite1 libxdamage1 libxfixes3 libxkbcommon0 \
    libxrandr2 xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# Download and extract CloakBrowser (stealth Chromium with anti-detection patches)
# Retry up to 3 times with resume support to handle CDN drops
ARG CLOAKBROWSER_URL=https://cloakbrowser.dev/chromium-v145.0.7632.159.2/cloakbrowser-linux-x64.tar.gz
RUN mkdir -p /opt/cloakbrowser && \
    curl -fSL --retry 3 --retry-delay 5 -C - "${CLOAKBROWSER_URL}" -o /tmp/cloakbrowser.tar.gz && \
    tar -xzf /tmp/cloakbrowser.tar.gz -C /opt/cloakbrowser && \
    rm /tmp/cloakbrowser.tar.gz && \
    chmod +x /opt/cloakbrowser/chrome

ENV PUPPETEER_EXECUTABLE_PATH=/opt/cloakbrowser/chrome

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

# Create non-root user for runtime
RUN groupadd -r scraper && useradd -rm -g scraper scraper
USER scraper
WORKDIR /app/pipeline/scrape-task
CMD ["node", "dist/index.js"]
