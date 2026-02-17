# Build context: src/
# NODE_20_SLIM: pass at build time for ECR pull-through cache
ARG NODE_20_SLIM=node:20-slim

# Stage 1: Build shared db package
FROM ${NODE_20_SLIM} AS db-builder
WORKDIR /app/packages/db
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY packages/db/package*.json ./
RUN npm ci
COPY packages/db/prisma ./prisma/
RUN npx prisma generate
COPY packages/db/src ./src/
COPY packages/db/tsconfig.json ./
RUN npx tsc

# Stage 2: Build places task
FROM ${NODE_20_SLIM} AS builder
WORKDIR /app

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY --from=db-builder /app/packages/db /app/packages/db

COPY pipeline/places-task/package*.json ./pipeline/places-task/
RUN cd pipeline/places-task && npm ci

COPY pipeline/places-task/index.ts ./pipeline/places-task/
COPY pipeline/places-task/tsconfig.json ./pipeline/places-task/
RUN cd pipeline/places-task && npx tsc --outDir dist --esModuleInterop --module commonjs --target es2022 --moduleResolution node --skipLibCheck index.ts

# Stage 3: Production
FROM ${NODE_20_SLIM}
WORKDIR /app

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY --from=db-builder /app/packages/db /app/packages/db
COPY --from=builder /app/pipeline/places-task/dist ./
COPY --from=builder /app/pipeline/places-task/package*.json ./
RUN npm ci --omit=dev

CMD ["node", "index.js"]
