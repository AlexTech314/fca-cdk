# Build context: src/ (not src/api/)
# Build db package first, then API
# NODE_20_SLIM: pass at build time for ECR pull-through cache (default: Docker Hub for local)
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

# Stage 2: Build API
FROM ${NODE_20_SLIM} AS builder
WORKDIR /app

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy built db package
COPY --from=db-builder /app/packages/db /app/packages/db

# Install API dependencies (resolves @fca/db via file: link)
COPY api/package*.json ./api/
RUN cd api && npm ci --install-links --ignore-scripts
COPY --from=db-builder /app/packages/db/node_modules/.prisma api/node_modules/.prisma/

# Copy API source and build
COPY api/src ./api/src/
COPY api/tsconfig.json ./api/
RUN cd api && npm run build

# Stage 3: Production image
FROM ${NODE_20_SLIM} AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs express

# Copy db package (needed at runtime for Prisma client)
COPY --from=db-builder --chown=express:nodejs /app/packages/db /app/packages/db

# Copy built API
COPY --from=builder --chown=express:nodejs /app/api/dist ./api/dist
COPY --from=builder --chown=express:nodejs /app/api/node_modules ./api/node_modules
COPY --from=builder --chown=express:nodejs /app/api/package.json ./api/

USER express

EXPOSE 3000

CMD ["node", "api/dist/index.js"]
