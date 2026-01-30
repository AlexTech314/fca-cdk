# Node Express API Server
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Production image
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 express

# Copy built assets
COPY --from=builder --chown=express:nodejs /app/dist ./dist
COPY --from=builder --chown=express:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=express:nodejs /app/package.json ./

USER express

EXPOSE 3000

CMD ["node", "dist/index.js"]
