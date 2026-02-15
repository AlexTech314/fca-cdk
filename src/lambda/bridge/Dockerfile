FROM public.ecr.aws/lambda/nodejs:20

COPY package*.json ./
RUN npm ci --omit=dev

COPY index.ts ./
RUN npx tsc --outDir . --esModuleInterop --module commonjs --target es2022 --moduleResolution node --skipLibCheck index.ts

CMD ["index.handler"]
