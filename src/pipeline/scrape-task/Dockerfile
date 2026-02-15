FROM ghcr.io/puppeteer/puppeteer:24.0.0

WORKDIR /app
COPY package*.json tsconfig.json ./
RUN npm ci
COPY index.ts ./
RUN npx tsc --outDir dist --esModuleInterop --module commonjs --target es2022 --moduleResolution node --skipLibCheck index.ts

# Puppeteer base image already has Chromium installed
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

CMD ["node", "dist/index.js"]
