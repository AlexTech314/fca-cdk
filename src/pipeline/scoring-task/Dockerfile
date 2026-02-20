# Build context: src/
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

# Stage 2: Build scoring task
FROM ${NODE_20_SLIM} AS builder
WORKDIR /app

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY --from=db-builder /app/packages/db /app/packages/db

COPY pipeline/scoring-task/package*.json ./pipeline/scoring-task/
COPY pipeline/scoring-task/tsconfig.json ./pipeline/scoring-task/
RUN cd pipeline/scoring-task && npm ci --install-links --ignore-scripts
COPY --from=db-builder /app/packages/db/node_modules/.prisma pipeline/scoring-task/node_modules/.prisma/

COPY pipeline/scoring-task/index.ts ./pipeline/scoring-task/
RUN cd pipeline/scoring-task && npm run build

# Stage 3: Production
FROM ${NODE_20_SLIM}
WORKDIR /app

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY --from=db-builder /app/packages/db /app/packages/db
COPY --from=builder /app/pipeline/scoring-task/dist ./dist/
COPY --from=builder /app/pipeline/scoring-task/node_modules ./node_modules/

CMD ["node", "dist/index.js"]
