FROM public.ecr.aws/lambda/nodejs:20

COPY package*.json ./
RUN npm ci

COPY index.ts ./
RUN npx tsc --outDir . --esModuleInterop --module commonjs --target es2022 --moduleResolution node --skipLibCheck index.ts

RUN npm prune --omit=dev

CMD ["index.handler"]
