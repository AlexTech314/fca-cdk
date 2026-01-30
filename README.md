# FCA CDK Project

AWS CDK TypeScript project with a self-mutating CI/CD pipeline.

## Project Structure

```
fca-cdk/
├── bin/
│   └── fca-cdk.ts            # App entry point
├── lib/
│   ├── pipeline-stack.ts      # Self-mutating pipeline
│   ├── stages/
│   │   └── fca-stage.ts       # Application deployment stage
│   └── stacks/
│       ├── ecr-cache-stack.ts # ECR pull-through cache (GHCR + DockerHub)
│       └── fca-stack.ts       # Application infrastructure
├── test/
│   └── fca-cdk.test.ts        # Unit tests
└── cdk.json                   # CDK configuration
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

After the initial deployment, the pipeline will self-mutate on each push.

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

Pull an image through ECR to seed the cache:

```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin {account}.dkr.ecr.us-east-1.amazonaws.com

# Pull through cache (this caches the image)
docker pull {account}.dkr.ecr.us-east-1.amazonaws.com/ghcr/org/image:tag
docker pull {account}.dkr.ecr.us-east-1.amazonaws.com/docker-hub/library/node:20-alpine
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

Add infrastructure to `lib/stacks/fca-stack.ts`:

```typescript
import * as s3 from 'aws-cdk-lib/aws-s3';

// Inside FcaStack constructor:
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
┌─────────────────────────────────────────────────────────────┐
│                     FcaPipelineStack                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                 CodePipeline                          │  │
│  │  ┌─────────┐  ┌───────┐  ┌────────────┐  ┌─────────┐  │  │
│  │  │ Source  │→ │ Build │→ │ UpdatePipe │→ │   Dev   │  │  │
│  │  │ GitHub  │  │ Synth │  │ SelfMutate │  │  Stage  │  │  │
│  │  └─────────┘  └───────┘  └────────────┘  └─────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                                                │
                                                ▼
┌─────────────────────────────────────────────────────────────┐
│                         Dev Stage                           │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                      FcaStack                         │  │
│  │              (Your infrastructure here)               │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

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
