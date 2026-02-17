# Build context: src/

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

# Stage 2: Build Lambda
FROM public.ecr.aws/lambda/nodejs:20 AS builder
WORKDIR ${LAMBDA_TASK_ROOT}

COPY --from=db-builder /app/packages/db /opt/packages/db

COPY lambda/start-places/package*.json ./
RUN npm ci

COPY lambda/start-places/index.ts ./
RUN npx tsc --outDir . --esModuleInterop --module commonjs --target es2022 --moduleResolution node --skipLibCheck index.ts

RUN npm prune --omit=dev

CMD ["index.handler"]
