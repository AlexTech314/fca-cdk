# FCA CDK Project

AWS CDK TypeScript project with a self-mutating CI/CD pipeline. Deploys a lead generation platform with RDS PostgreSQL, ECS Fargate API, Cognito auth, SPA + CloudFront, and a scraping/scoring pipeline (Lambda, Step Functions, SQS).

## Project Structure

```
fca-cdk/
├── bin/
│   └── fca-cdk.ts              # App entry point
├── lib/
│   ├── pipeline-stack.ts        # Self-mutating pipeline
│   ├── stages/
│   │   └── fca-stage.ts        # Application deployment stage
│   └── stacks/
│       ├── ecr-cache-stack.ts  # ECR pull-through cache (GHCR + DockerHub)
│       ├── network-stack.ts    # VPC, fck-nat (t4g.nano)
│       ├── stateful-stack.ts   # RDS PostgreSQL, S3 campaign bucket
│       ├── leadgen-pipeline-stack.ts  # Lambdas, SQS, Step Functions, Fargate tasks
│       ├── cognito-stack.ts    # User Pool, App Client, Domain
│       ├── api-stack.ts        # ECS Fargate API + ALB
│       ├── leadgen-web-stack.ts      # SPA bucket + CloudFront
│       └── dns-stack.ts        # Route53 (placeholder)
├── src/
│   ├── api/                    # Express API (Prisma, PostgreSQL)
│   ├── lead-gen-spa/           # Vite + React SPA
│   ├── flagship-ui/nextjs-web/ # Next.js admin
│   └── pipeline/               # Lambda handlers, scrape-task
├── test/
│   └── fca-cdk.test.ts        # Unit tests
└── cdk.json                    # CDK configuration
```

## Prerequisites

1. **AWS CLI** configured with appropriate credentials
2. **Node.js** (18.x or later)
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

### 6. Deploy ECR Cache Stack (FIRST)

```bash
npx cdk deploy FcaEcrCache
```

### 7. Deploy the Pipeline (SECOND)

```bash
# Commit your code first!
git add .
git commit -m "Initial CDK pipeline setup"
git push origin main

# Deploy the pipeline stack (one-time manual deployment)
npx cdk deploy FcaPipelineStack
```

After the initial deployment, the pipeline will self-mutate on each push. The Dev stage deploys 6 stacks in order: Network → Stateful → LeadGenPipeline → Cognito → Api → LeadGenWeb.

## ECR Pull-Through Cache

The `FcaEcrCache` stack sets up ECR pull-through cache for both GitHub Container Registry and Docker Hub. This:

- Avoids Docker Hub rate limits
- Caches images in your AWS account for faster pulls
- Works with the CDK pipeline's Docker builds

### Image Mapping

| Original Image | Cached Image |
|---------------|--------------|
| `ghcr.io/org/image:tag` | `{account}.dkr.ecr.{region}.amazonaws.com/ghcr/org/image:tag` |
| `node:20-alpine` | `{account}.dkr.ecr.{region}.amazonaws.com/docker-hub/library/node:20-alpine` |
| `nginx:latest` | `{account}.dkr.ecr.{region}.amazonaws.com/docker-hub/library/nginx:latest` |

> **Note**: Official Docker Hub images use the `library/` prefix.

### Seeding the Cache

Pull an image through ECR to seed the cache (region: `us-east-2`):

```bash
# Login to ECR
aws ecr get-login-password --region us-east-2 | docker login --username AWS --password-stdin {account}.dkr.ecr.us-east-2.amazonaws.com

# Pull through cache (this caches the image)
docker pull {account}.dkr.ecr.us-east-2.amazonaws.com/ghcr/org/image:tag
docker pull {account}.dkr.ecr.us-east-2.amazonaws.com/docker-hub/library/node:20-alpine
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

## Adding New Resources

Add infrastructure to the appropriate stack in `lib/stacks/` (e.g., `stateful-stack.ts` for S3, `api-stack.ts` for API-related resources):

```typescript
import * as s3 from 'aws-cdk-lib/aws-s3';

// Inside stack constructor:
const bucket = new s3.Bucket(this, 'MyBucket', {
  removalPolicy: cdk.RemovalPolicy.DESTROY,
});
```

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
┌─────────────────────────────────────────────────────────────────────────────┐
│                     FcaPipelineStack                                         │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                 CodePipeline                                          │  │
│  │  ┌─────────┐  ┌───────┐  ┌────────────┐  ┌─────────────────────────┐  │  │
│  │  │ Source  │→ │ Build │→ │ UpdatePipe │→ │   Dev Stage (6 stacks)   │  │  │
│  │  │ GitHub  │  │ Synth │  │ SelfMutate │  │  Network→Stateful→...   │  │  │
│  │  └─────────┘  └───────┘  └────────────┘  └─────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                                         │
                                                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Dev Stage (us-east-2)                                │
│  Network → Stateful → LeadGenPipeline → Cognito → Api → LeadGenWeb           │
│  ┌─────────┐  ┌──────────┐  ┌────────────┐  ┌─────────┐  ┌───────┐  ┌─────┐ │
│  │ VPC +   │  │ RDS + S3 │  │ Lambdas +  │  │ Cognito │  │ Fargate│  │ SPA │ │
│  │ fck-nat │  │  bucket  │  │ Step Fns  │  │  Pool   │  │ API+ALB│  │ CF  │ │
│  └─────────┘  └──────────┘  └────────────┘  └─────────┘  └───────┘  └─────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

## AWS Cost Estimate (per day)

Pricing from AWS Price List API for **us-east-2**. Assumes low/dev traffic (~1K CloudFront requests/day, minimal pipeline runs).

### Always-On Resources (24/7)

| Resource | Config | Unit Price | Daily Cost |
|----------|--------|------------|------------|
| **EC2 NAT** (fck-nat) | t4g.nano (ARM64) | $0.0042/hr | **$0.10** |
| **RDS PostgreSQL** | db.t4g.micro, Single-AZ | $0.016/hr | **$0.38** |
| **RDS Storage** | 20 GB gp2 | $0.115/GB-mo | **$0.08** |
| **ECS Fargate API** | 0.25 vCPU, 0.5 GB ARM64 | vCPU $0.03238/hr + Mem $0.00356/hr | **$0.24** |
| **ALB** | Application LB | $0.0225/hr + $0.008/LCU-hr | **$0.64** |
| **Secrets Manager** | 5 secrets | $0.40/secret/mo | **$0.07** |
| **CodePipeline** | 1 active pipeline | $1.00/pipeline-mo | **$0.03** |
| **ECR Storage** | ~5 GB images | $0.10/GB-mo | **$0.02** |
| | | **Always-on subtotal** | **$1.56/day** |

### Variable / Event-Driven

| Resource | Estimate | Daily Cost |
|----------|----------|------------|
| CloudFront | ~1K req + ~0.5 GB transfer | **$0.04** |
| CloudWatch Logs | ~100 MB/day ingested | **$0.05** |
| Lambda | 5 fns, ~100 invocations/day | **< $0.01** |
| Fargate scrape tasks | ~5 runs × 10 min when active | **$0.04** |
| Step Functions, SQS, S3, CodeBuild | Minimal usage | **~$0.05** |
| Cognito | < 50K MAU (free tier) | **$0.00** |
| | **Variable subtotal** | **~$0.18/day** |

### Totals

| Category | Daily | Monthly (30 days) |
|----------|-------|-------------------|
| Always-on | **$1.56** | **$46.80** |
| Variable | **~$0.18** | **~$5.40** |
| **Total** | **~$1.74/day** | **~$52.20/mo** |

**Top cost drivers:** ALB (~37%), RDS (~26%), ECS Fargate API (~14%). The fck-nat t4g.nano saves ~$29/mo vs a managed NAT Gateway.

*Excludes: Claude API (Anthropic), Google Places API, data transfer between AZs. Heavy scrape runs (30+ concurrent Fargate tasks) can add $2–5/day.*

## Security Considerations

- The pipeline uses cross-account keys for secure deployments
- IAM roles are automatically scoped with least-privilege policies
- Secrets should be stored in AWS Secrets Manager or Parameter Store

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
