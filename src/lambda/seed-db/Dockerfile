# Build context: src/

# Stage 1: Build lean db package (schema, migrations, client)
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

# Stage 2: Build seed package (includes data files)
FROM node:20-slim AS seed-builder
WORKDIR /app
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY --from=db-builder /app/packages/db /app/packages/db
COPY packages/seed/package*.json ./packages/seed/
RUN cd packages/seed && npm ci
COPY packages/seed/ ./packages/seed/

# Stage 3: Lambda runtime
FROM public.ecr.aws/lambda/nodejs:20
WORKDIR ${LAMBDA_TASK_ROOT}

# Copy db package (for migrations + Prisma client)
COPY --from=db-builder /app/packages/db /app/packages/db

# Copy seed package (seed logic + data files)
COPY --from=seed-builder /app/packages/seed /app/packages/seed

# Install Lambda deps
COPY lambda/seed-db/package*.json ./
RUN npm ci

# Compile handler
COPY lambda/seed-db/index.ts ./
RUN npx tsc --outDir . --esModuleInterop --module commonjs --target es2022 --moduleResolution node --skipLibCheck index.ts

RUN npm prune --omit=dev

CMD ["index.handler"]
