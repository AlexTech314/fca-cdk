# Build context: src/
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

# Stage 2: Build contact extraction task
FROM ${NODE_20_SLIM} AS builder
WORKDIR /app

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY --from=db-builder /app/packages/db /app/packages/db

COPY pipeline/contact-extraction-task/package*.json ./pipeline/contact-extraction-task/
COPY pipeline/contact-extraction-task/tsconfig.json ./pipeline/contact-extraction-task/
RUN cd pipeline/contact-extraction-task && npm install --install-links --ignore-scripts
COPY --from=db-builder /app/packages/db/node_modules/.prisma pipeline/contact-extraction-task/node_modules/.prisma/

COPY pipeline/contact-extraction-task/*.ts ./pipeline/contact-extraction-task/
RUN cd pipeline/contact-extraction-task && npm run build

# Stage 3: Production
FROM ${NODE_20_SLIM}
WORKDIR /app

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY --from=db-builder /app/packages/db /app/packages/db
COPY --from=builder /app/pipeline/contact-extraction-task/dist ./dist/
COPY --from=builder /app/pipeline/contact-extraction-task/node_modules ./node_modules/
COPY --from=db-builder /app/packages/db/node_modules/@prisma /app/node_modules/@prisma
COPY --from=db-builder /app/packages/db/node_modules/.prisma /app/node_modules/.prisma

CMD ["node", "dist/index.js"]
