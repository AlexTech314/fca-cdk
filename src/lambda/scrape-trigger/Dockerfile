# Build context: src/
FROM public.ecr.aws/lambda/nodejs:20

COPY lambda/scrape-trigger/package*.json ./
RUN npm ci

COPY lambda/scrape-trigger/index.ts ./
RUN npx tsc --outDir . --esModuleInterop --module commonjs --target es2022 --moduleResolution node --skipLibCheck index.ts

RUN npm prune --omit=dev

CMD ["index.handler"]
