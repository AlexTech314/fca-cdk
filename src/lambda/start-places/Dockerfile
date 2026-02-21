# Build context: src/
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

# Stage 2: Build Lambda
FROM public.ecr.aws/lambda/nodejs:24 AS builder
WORKDIR ${LAMBDA_TASK_ROOT}

COPY --from=db-builder /app/packages/db /packages/db

COPY lambda/start-places/package*.json ./
RUN npm ci --install-links --ignore-scripts
COPY --from=db-builder /app/packages/db/node_modules/.prisma node_modules/.prisma/

COPY lambda/start-places/index.ts ./
RUN npx tsc --outDir . --esModuleInterop --module commonjs --target es2022 --moduleResolution node --skipLibCheck index.ts

RUN npm prune --omit=dev

CMD ["index.handler"]
