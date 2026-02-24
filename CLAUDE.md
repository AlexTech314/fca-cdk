# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AWS CDK TypeScript project implementing a self-mutating CI/CD pipeline that deploys a lead generation platform on AWS. The platform includes an Express API, React SPA, Next.js sites, PostgreSQL database, web scraping pipeline, and Claude-powered lead scoring.

## Common Commands

- `npm run build` — Compile CDK TypeScript (root tsconfig only covers `lib/`, `bin/`, `test/`)
- `npm test` — Run CDK synthesis tests (Jest + CDK Template assertions)
- `npx jest test/fca-cdk.test.ts` — Run a single test file
- `npm run install:all` — Install dependencies for root + all sub-packages in `src/`
- `npx cdk synth` — Synthesize CloudFormation templates
- `npx cdk deploy <StackName>` — Deploy a specific stack
- `npm run dupes` — Check for code duplication (jscpd)
- `npm run todos` — Scan for TODO/FIXME comments (leasot)

## Architecture

### Entry Point & Top-Level Stacks

`bin/fca-cdk.ts` instantiates three top-level stacks:
1. **FcaEcrCache** — ECR pull-through cache (deploy first)
2. **FcaDns** — Route 53 hosted zone (deploy manually)
3. **FcaPipelineStack** — Self-mutating CodePipeline (deploy second)

### Pipeline & Stage

`lib/pipeline-stack.ts` creates a CDK Pipelines `CodePipeline` (GitHub source via CodeStar Connections, self-mutation enabled). It adds a Dev stage defined in `lib/stages/fca-stage.ts`.

### Dev Stage — 7 Stacks (deployment order)

All stack implementations live in `lib/stacks/`. Dependencies are explicit via `addDependency()` and cross-stack values are passed via props.

1. **NetworkStack** — VPC with fck-nat instances (cost-optimized NAT)
2. **CognitoStack** — User Pool, App Client, Groups, Hosted UI
3. **StatefulStack** — RDS PostgreSQL 16, S3 bucket, seed-db Lambda (depends on Network, Cognito)
4. **LeadGenPipelineStack** — SQS queues, Bridge Lambda, Fargate scrape/places/scoring tasks, Step Functions (depends on Stateful)
5. **ApiStack** — Express on Fargate behind ALB (depends on Stateful, LeadGenPipeline, Cognito)
6. **LeadGenWebStack** — Vite React SPA on S3 + CloudFront (depends on Api)
7. **FlagshipWebStack** — Next.js public + admin sites on Fargate + CloudFront (depends on Api, Cognito)

### Monorepo Sub-Packages

Each has its own `package.json` and `node_modules`. The `scripts/install-all.js` script discovers and installs them in dependency order (`src/packages/db` and `src/packages/seed` first).

- `src/api/` — Express API (Prisma ORM, AWS SDK v3, Zod, Pino)
- `src/lead-gen-spa/` — Vite + React SPA (Radix UI, TanStack Query, Amplify auth)
- `src/flagship-ui/nextjs-web/` — Next.js 14 (separate `Dockerfile.public` and `Dockerfile.admin`)
- `src/packages/db/` — Prisma schema + generated client (shared)
- `src/packages/seed/` — Database seeding utilities (shared)
- `src/lambda/` — Lambda functions: `bridge/`, `seed-db/`, `start-places/`, `scrape-trigger/`, `scoring-trigger/`
- `src/pipeline/` — Fargate task containers: `places-task/`, `scrape-task/`, `scoring-task/`

### Key Patterns

- **Docker builds** use `TokenInjectableDockerBuilder` for runtime CDK token injection and ECR pull-through cache to avoid Docker Hub rate limits
- **ARM64** Fargate instances used where possible for cost savings
- **Database**: PostgreSQL on RDS (db.t4g.small), Prisma ORM, `aws_lambda` extension for RDS-to-Lambda invocation
- **Auth**: Cognito with `aws-jwt-verify` on the API side, Amplify on the SPA
- **Configuration**: `cdk.json` context holds account, region, domain, GitHub config, and Vite Cognito values (baked into SPA at build time)
- **TypeScript**: Strict mode, ES2022 target, NodeNext module resolution. Root tsconfig excludes all `src/` sub-packages (they have their own configs)
