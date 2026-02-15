FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json tsconfig.json ./
RUN npm ci
COPY index.ts ./
RUN npx tsc --outDir dist --esModuleInterop --module commonjs --target es2022 --moduleResolution node --skipLibCheck index.ts

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./
COPY package*.json ./
RUN npm ci --omit=dev
CMD ["node", "index.js"]
