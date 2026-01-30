# FCA CDK Project

AWS CDK TypeScript project with a self-mutating CI/CD pipeline.

## Project Structure

```
fca-cdk/
├── bin/
│   └── fca-cdk.ts           # App entry point
├── lib/
│   ├── pipeline-stack.ts     # Self-mutating pipeline
│   ├── stages/
│   │   └── fca-stage.ts      # Application deployment stage
│   └── stacks/
│       └── fca-stack.ts      # Application infrastructure
├── test/
│   └── fca-cdk.test.ts       # Unit tests
└── cdk.json                  # CDK configuration
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

### 5. Deploy the Pipeline

```bash
# Commit your code first!
git add .
git commit -m "Initial CDK pipeline setup"
git push origin main

# Deploy the pipeline stack (one-time manual deployment)
npx cdk deploy FcaPipelineStack
```

After the initial deployment, the pipeline will self-mutate on each push.

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
