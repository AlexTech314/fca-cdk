# Build context: src/
# NODE_20_SLIM: pass at build time for ECR pull-through cache
ARG NODE_20_SLIM=node:24-slim

# Stage 1: Build lean db package (schema, migrations, client)
FROM ${NODE_20_SLIM} AS db-builder
WORKDIR /app/packages/db
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY packages/db/package*.json ./
RUN npm ci --ignore-scripts
COPY packages/db/prisma ./prisma/
RUN npx prisma generate
COPY packages/db/src ./src/
COPY packages/db/tsconfig.json ./
RUN npx tsc

# Stage 2: Build seed package (includes data files)
FROM ${NODE_20_SLIM} AS seed-builder
WORKDIR /app
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY --from=db-builder /app/packages/db /app/packages/db
COPY packages/seed/package*.json ./packages/seed/
RUN cd packages/seed && npm ci --install-links --ignore-scripts
COPY --from=db-builder /app/packages/db/node_modules/@prisma /app/packages/seed/node_modules/@prisma/
COPY --from=db-builder /app/packages/db/node_modules/.prisma /app/packages/seed/node_modules/.prisma/
COPY packages/seed/ ./packages/seed/
RUN cd packages/seed && npx tsc

# Stage 3: Lambda runtime
FROM public.ecr.aws/lambda/nodejs:24
WORKDIR ${LAMBDA_TASK_ROOT}

# Copy db package (for migrations + Prisma client)
# Path must match file: refs in package.json (../../packages/db from /var/task = /packages/db)
COPY --from=db-builder /app/packages/db /packages/db

# Copy seed package (seed logic + data files)
COPY --from=seed-builder /app/packages/seed /packages/seed

# Install Lambda deps
COPY lambda/seed-db/package*.json ./
RUN npm ci --install-links --ignore-scripts
# Restore Prisma client: package + pre-generated output (npm ci with --ignore-scripts skips prisma generate)
COPY --from=db-builder /app/packages/db/node_modules/@prisma node_modules/@prisma/
COPY --from=db-builder /app/packages/db/node_modules/.prisma node_modules/.prisma/

# Compile handler
COPY lambda/seed-db/index.ts ./
RUN npx tsc --outDir . --esModuleInterop --module commonjs --target es2022 --moduleResolution node --skipLibCheck index.ts

RUN npm prune --omit=dev

CMD ["index.handler"]
