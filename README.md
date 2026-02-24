# FCA CDK Project

AWS CDK TypeScript project with a self-mutating CI/CD pipeline. Deploys a lead generation platform with RDS PostgreSQL, ECS Fargate API, Cognito auth, SPA + CloudFront, Next.js (public + admin) on Fargate behind CloudFront, and a scraping/scoring pipeline (Lambda, Step Functions, SQS, Fargate tasks).

## Project Structure

```
fca-cdk/
├── bin/
│   └── fca-cdk.ts                  # App entry point
├── lib/
│   ├── pipeline-stack.ts           # Self-mutating pipeline
│   ├── stages/
│   │   └── fca-stage.ts            # Application deployment stage
│   └── stacks/
│       ├── ecr-cache-stack.ts      # ECR pull-through cache (GHCR + DockerHub)
│       ├── network-stack.ts        # VPC, fck-nat (t4g.nano)
│       ├── stateful-stack.ts       # RDS PostgreSQL, S3 campaign bucket, seed-db Lambda
│       ├── cognito-stack.ts        # User Pool, App Client, Domain, Groups
│       ├── leadgen-pipeline-stack.ts  # Lambdas, SQS, Step Functions, Fargate tasks
│       ├── api-stack.ts            # Shared ECS Fargate API + ALB
│       ├── leadgen-web-stack.ts    # Lead-gen SPA bucket + CloudFront
│       ├── flagship-web-stack.ts   # Next.js public + admin Fargate + CloudFront
│       └── dns-stack.ts            # Route 53 hosted zone (flatironscap.com)
├── src/
│   ├── api/                        # Express API (Prisma, PostgreSQL)
│   ├── flagship-ui/nextjs-web/     # Next.js public + admin site
│   ├── lead-gen-spa/               # Vite + React SPA
│   ├── lambda/
│   │   ├── bridge/                 # PG trigger → SQS bridge
│   │   ├── seed-db/                # Database migration + seeding
│   │   ├── start-places/           # Starts places ingestion Fargate tasks
│   │   ├── prepare-scrape/         # Prepares scrape batches
│   │   ├── aggregate-scrape/       # Aggregates scrape results
│   │   └── score-leads/            # Scores leads using Claude API
│   ├── packages/
│   │   ├── db/                     # Prisma schema + client
│   │   └── seed/                   # Database seeding utilities
│   └── pipeline/
│       ├── places-task/            # Google Places ingestion Fargate task
│       └── scrape-task/            # Web scraping Fargate task (Puppeteer)
├── test/
│   └── fca-cdk.test.ts             # Unit tests
└── cdk.json                        # CDK configuration
```

## Prerequisites

1. **AWS CLI** configured with appropriate credentials
2. **Node.js** (20.x or later)
3. **CDK Bootstrap** completed in your target account/region

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Create CodeStar Connection

Create a GitHub connection in the AWS Console:

1. Go to **Developer Tools** > **Settings** > **Connections**
2. Click **Create connection**
3. Select **GitHub** and follow the authorization flow
4. Copy the connection ARN

### 3. Configure the Pipeline

Update `cdk.json` context values:

```json
{
  "context": {
    "repositoryName": "your-org/fca-cdk",
    "branchName": "main",
    "connectionArn": "arn:aws:codestar-connections:REGION:ACCOUNT:connection/CONNECTION_ID"
  }
}
```

Or pass them via CLI:

```bash
npx cdk deploy -c repositoryName=your-org/fca-cdk \
               -c connectionArn=arn:aws:codestar-connections:...
```

### 4. Bootstrap CDK (if not already done)

```bash
npx cdk bootstrap aws://ACCOUNT_ID/REGION
```

### 5. Create ECR Pull-Through Cache Secrets

Create secrets for GitHub Container Registry and Docker Hub:

```bash
# GHCR secret (GitHub Personal Access Token with read:packages scope)
aws secretsmanager create-secret \
  --name ecr-pullthroughcache/ghcr \
  --secret-string '{"username":"YOUR_GITHUB_USERNAME","accessToken":"ghp_YOUR_PAT"}'

# Docker Hub secret (Docker Hub Access Token)
aws secretsmanager create-secret \
  --name ecr-pullthroughcache/docker-hub \
  --secret-string '{"username":"YOUR_DOCKERHUB_USERNAME","accessToken":"YOUR_DOCKERHUB_PAT"}'
```

> **Note**: The secret names MUST have the `ecr-pullthroughcache/` prefix per AWS requirements.

### 5b. Create Pipeline Secrets (for LeadGenPipeline)

The pipeline expects these secrets (create before first Dev stage deployment):

```bash
# Google Places API key (for places-task)
aws secretsmanager create-secret --name fca/GOOGLE_API_KEY --secret-string "YOUR_GOOGLE_API_KEY"

# Claude API key (for scoring Lambda)
aws secretsmanager create-secret --name fca/CLAUDE_API_KEY --secret-string "YOUR_ANTHROPIC_API_KEY"
```

### 6. Deploy Standalone Stacks

Deploy these manually before the pipeline:

```bash
# ECR Cache (FIRST)
npx cdk deploy FcaEcrCache

# DNS (when ready to manage flatironscap.com in Route 53)
npx cdk deploy FcaDns
```

After deploying FcaDns, update your domain registrar's nameservers to the NS records from the stack output.

### 7. Deploy the Pipeline

```bash
# Commit your code first!
git add .
git commit -m "Initial CDK pipeline setup"
git push origin main

# Deploy the pipeline stack (one-time manual deployment)
npx cdk deploy FcaPipelineStack
```

After the initial deployment, the pipeline will self-mutate on each push.

## Deployment Stages

The Dev stage deploys 7 stacks:

| Order | Stack | Purpose | Dependencies |
|-------|-------|---------|--------------|
| 1 | **NetworkStack** | VPC with fck-nat (t4g.nano x2), S3 gateway endpoint | None |
| 2 | **CognitoStack** | User Pool, App Client, Domain, Groups (admin/readwrite/readonly) | None |
| 3 | **StatefulStack** | RDS PostgreSQL (db.t4g.small), S3 campaign bucket, seed-db Lambda | Network, Cognito |
| 4 | **LeadGenPipelineStack** | SQS queues, Bridge Lambda, Fargate tasks, Step Functions, Scoring Lambda | Stateful |
| 5 | **ApiStack** | Shared Express API on Fargate + ALB | Stateful, LeadGenPipeline, Cognito |
| 6 | **LeadGenWebStack** | Lead-gen SPA in S3 + CloudFront | Api |
| 7 | **FlagshipWebStack** | Next.js public + admin on Fargate + CloudFront | Api, Cognito |

## Flagship Next.js (FlagshipWebStack)

Two Fargate services built from the same codebase (`src/flagship-ui/nextjs-web`) using separate Dockerfiles:

- **Public** (`Dockerfile.public`) -- public-facing website behind CloudFront with 5-minute cache TTL
- **Admin** (`Dockerfile.admin`) -- admin dashboard behind CloudFront with no caching, authenticated via Cognito

Both share the ApiStack ALB with header-based routing (`X-Origin-Service` header). Images are built at deploy time using [`token-injectable-docker-builder`](https://constructs.dev/packages/token-injectable-docker-builder) so CDK tokens (ALB DNS, Cognito IDs) can be injected as Docker build args.

## ECR Pull-Through Cache

The `FcaEcrCache` stack sets up ECR pull-through cache for both GitHub Container Registry and Docker Hub. This:

- Avoids Docker Hub rate limits
- Caches images in your AWS account for faster pulls
- Works with the CDK pipeline's Docker builds

### Image Mapping

| Original Image | Cached Image |
|---------------|--------------|
| `ghcr.io/org/image:tag` | `{account}.dkr.ecr.{region}.amazonaws.com/ghcr/org/image:tag` |
| `node:24-alpine` | `{account}.dkr.ecr.{region}.amazonaws.com/docker-hub/library/node:24-alpine` |
| `nginx:latest` | `{account}.dkr.ecr.{region}.amazonaws.com/docker-hub/library/nginx:latest` |

> **Note**: Official Docker Hub images use the `library/` prefix.

### Seeding the Cache

Pull an image through ECR to seed the cache (region: `us-east-2`):

```bash
# Login to ECR
aws ecr get-login-password --region us-east-2 | docker login --username AWS --password-stdin {account}.dkr.ecr.us-east-2.amazonaws.com

# Pull through cache (this caches the image)
docker pull {account}.dkr.ecr.us-east-2.amazonaws.com/ghcr/org/image:tag
docker pull {account}.dkr.ecr.us-east-2.amazonaws.com/docker-hub/library/node:24-alpine
```

## Development

### Build

```bash
npm run build
```

### Run Tests

```bash
npm test
```

### Synthesize CloudFormation

```bash
npx cdk synth
```

### Compare Changes

```bash
npx cdk diff
```

### Local UIs with Cloud API

You can run the lead-gen-spa and nextjs-web UIs locally while pointing them at the deployed cloud API. The API CORS already allows localhost origins (5173, 3000, etc.).

**1. Get stack outputs** (after pipeline deploys the Dev stage):

```bash
aws cloudformation describe-stacks --stack-name Dev-LeadGenWebStack --query 'Stacks[0].Outputs' --output table
aws cloudformation describe-stacks --stack-name Dev-CognitoStack --query 'Stacks[0].Outputs' --output table
```

You need:
- **CloudFront domain** (`DistributionDomainName`) -- API base: `https://{domain}/api`
- **Cognito** `UserPoolId`, `UserPoolClientId`, `CognitoDomainPrefix` -- domain: `https://{prefix}.auth.{region}.amazoncognito.com`

**2. lead-gen-spa**

```bash
cd src/lead-gen-spa
cp .env.cloud.example .env.local
# Edit .env.local with your CloudFront domain and Cognito values
npm run dev
```

**3. nextjs-web (admin)**

```bash
cd src/flagship-ui/nextjs-web
cp .env.cloud.example .env.local
# Edit .env.local with your CloudFront domain and Cognito values
# Do NOT set NEXT_PUBLIC_COGNITO_ENDPOINT (only for cognito-local)
npm run dev
```

**Cognito callbacks:** The Cognito app client already includes `http://localhost:5173/` for the lead-gen-spa OAuth flow. For nextjs-web (SRP login), no callback URLs are needed.

## Adding New Stages

To add additional environments (e.g., Production):

```typescript
// In lib/pipeline-stack.ts
const prodStage = new FcaStage(this, 'Prod', {
  env: { account: 'PROD_ACCOUNT', region: 'us-east-1' },
});

this.pipeline.addStage(prodStage, {
  pre: [
    new pipelines.ManualApprovalStep('PromoteToProd'),
  ],
});
```

## Useful Commands

| Command | Description |
|---------|-------------|
| `npm run build` | Compile TypeScript to JavaScript |
| `npm run watch` | Watch for changes and compile |
| `npm run test` | Run unit tests |
| `npx cdk deploy` | Deploy this stack to AWS |
| `npx cdk diff` | Compare deployed stack with current state |
| `npx cdk synth` | Emit synthesized CloudFormation template |

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         Standalone Stacks                                       │
│  ┌──────────────┐  ┌──────────────────────────────────────────────────────────┐ │
│  │  FcaEcrCache │  │  FcaDns (Route 53: flatironscap.com)                     │ │
│  └──────────────┘  └──────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                     FcaPipelineStack                                            │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │                 CodePipeline (self-mutating)                              │  │
│  │  ┌─────────┐  ┌───────┐  ┌────────────┐  ┌──────────────────────────┐     │  │
│  │  │ Source  │→ │ Build │→ │ UpdatePipe │→ │   Dev Stage (7 stacks)   │     │  │
│  │  │ GitHub  │  │ Synth │  │ SelfMutate │  │                          │     │  │
│  │  └─────────┘  └───────┘  └────────────┘  └──────────────────────────┘     │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                         Dev Stage (us-east-2)                                   │
│                                                                                 │
│  Network ──┐                                                                    │
│            ├── Stateful ── LeadGenPipeline ──┐                                  │
│  Cognito ──┘                                 ├── Api ── LeadGenWeb              │
│              ───────────────────────────────────┘  └── FlagshipWeb              │
│                                                                                 │
│  ┌────────┐ ┌────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────┐ ┌──────┐ │
│  │VPC +   │ │Cognito │ │RDS + S3  │ │Lambdas + │ │Fargate   │ │SPA + │ │NextJS│ │
│  │fck-nat │ │Pool +  │ │+ seed-db │ │Step Fns +│ │API + ALB │ │CF    │ │pub + │ │
│  │        │ │Groups  │ │          │ │Fargate   │ │(shared)  │ │      │ │admin │ │
│  └────────┘ └────────┘ └──────────┘ └──────────┘ └──────────┘ └──────┘ └──────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## AWS Cost Estimate (per day)

Pricing from AWS Price List API for **us-east-2**. Assumes low/dev traffic (~1K CloudFront requests/day, minimal pipeline runs).

### Always-On Resources (24/7)

| Resource | Config | Unit Price | Daily Cost |
|----------|--------|------------|------------|
| **EC2 NAT** (fck-nat x2) | t4g.nano (ARM64) per AZ | $0.0042/hr each | **$0.20** |
| **RDS PostgreSQL** | db.t4g.small, Single-AZ | $0.032/hr | **$0.77** |
| **RDS Storage** | 20 GB gp2 | $0.115/GB-mo | **$0.08** |
| **ECS Fargate API** | 0.25 vCPU, 0.5 GB ARM64 | vCPU $0.03238/hr + Mem $0.00356/hr | **$0.24** |
| **ECS Fargate Next.js** (x2) | 0.25 vCPU, 0.5 GB x86_64 each | vCPU $0.04048/hr + Mem $0.004445/hr | **$0.59** |
| **ALB** | Application LB (shared) | $0.0225/hr + $0.008/LCU-hr | **$0.64** |
| **Secrets Manager** | 5 secrets | $0.40/secret/mo | **$0.07** |
| **CodePipeline** | 1 active pipeline | $1.00/pipeline-mo | **$0.03** |
| **ECR Storage** | ~5 GB images | $0.10/GB-mo | **$0.02** |
| | | **Always-on subtotal** | **$2.64/day** |

### Variable / Event-Driven

| Resource | Estimate | Daily Cost |
|----------|----------|------------|
| CloudFront (x3 distributions) | ~1K req + ~0.5 GB transfer | **$0.04** |
| CloudWatch Logs | ~100 MB/day ingested | **$0.05** |
| Lambda | 6 fns, ~100 invocations/day | **< $0.01** |
| Fargate scrape tasks | ~5 runs x 10 min when active | **$0.04** |
| Step Functions, SQS, S3, CodeBuild | Minimal usage | **~$0.05** |
| Cognito | < 50K MAU (free tier) | **$0.00** |
| | **Variable subtotal** | **~$0.18/day** |

### Totals

| Category | Daily | Monthly (30 days) |
|----------|-------|-------------------|
| Always-on | **$2.64** | **$79.20** |
| Variable | **~$0.18** | **~$5.40** |
| **Total** | **~$2.82/day** | **~$84.60/mo** |

**Top cost drivers:** ECS Fargate (~37%), ALB (~28%), RDS (~27%). Two fck-nat t4g.nano instances save ~$55/mo vs managed NAT Gateways ($32/mo each).

*Excludes: Claude API (Anthropic), Google Places API, data transfer between AZs. Heavy scrape runs (30+ concurrent Fargate tasks) can add $2-5/day.*

## Security Considerations

- The pipeline uses cross-account keys for secure deployments
- IAM roles are automatically scoped with least-privilege policies
- Secrets should be stored in AWS Secrets Manager or Parameter Store
- Cognito user groups (admin, readwrite, readonly) enforce API authorization

## Troubleshooting

### Pipeline Not Updating

The pipeline self-mutates based on code in your repository. Make sure to:
1. Commit and push your changes
2. Wait for the pipeline to complete its current run

### Connection Issues

If the pipeline can't access GitHub:
1. Verify the CodeStar connection is in "Available" status
2. Re-authorize the connection if needed
3. Check the connection ARN is correct in `cdk.json`

### Docker Build Cache

Pipeline asset publishing uses CodeBuild local Docker layer caching by default. To disable (for debugging or after major dependency changes):

```json
{
  "context": {
    "disableDockerCache": "true"
  }
}
```

### Next.js Deploy-Time Build Failures

FlagshipWebStack builds Docker images at deploy time via CodeBuild. If a build fails and CloudFormation rolls back, check CloudWatch Logs -- the build log groups use RETAIN removal policy so logs persist after rollback. Look for log groups named after the construct (e.g., `PublicBuildLogGroup`, `AdminBuildLogGroup`).
