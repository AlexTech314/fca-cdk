#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { PipelineStack } from '../lib/pipeline-stack';
import { EcrCacheStack } from '../lib/stacks/ecr-cache-stack';

const app = new cdk.App();

// Environment configuration
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

// Pipeline configuration from context
const pipelineConfig = {
  repositoryName: app.node.tryGetContext('repositoryName') || 'OWNER/fca-cdk',
  branchName: app.node.tryGetContext('branchName') || 'main',
  connectionArn: app.node.tryGetContext('connectionArn') || 'arn:aws:codestar-connections:REGION:ACCOUNT:connection/CONNECTION_ID',
};

// ============================================================
// ECR Cache Stack - Deploy FIRST (before Pipeline)
// ============================================================
//
// Sets up ECR pull-through cache for GitHub Container Registry and Docker Hub.
// Must be deployed before Pipeline so Docker builds can use cached images.
//
// Prerequisites:
// 1. Create secret: ecr-pullthroughcache/ghcr with GHCR credentials
// 2. Create secret: ecr-pullthroughcache/docker-hub with Docker Hub credentials
// 3. Deploy this stack: npx cdk deploy FcaEcrCache
// 4. Seed the cache by pulling an image through ECR
//
new EcrCacheStack(app, 'FcaEcrCache', { env });

// ============================================================
// Pipeline Stack - Deploy SECOND after ECR Cache
// ============================================================
//
// Prerequisites:
// 1. Create GitHub connection in AWS Console
// 2. Set repositoryName, connectionArn in cdk.context.json
// 3. ECR Cache must be deployed
//
new PipelineStack(app, 'FcaPipelineStack', {
  repositoryName: pipelineConfig.repositoryName,
  branchName: pipelineConfig.branchName,
  connectionArn: pipelineConfig.connectionArn,
  env,
  tags: {
    Project: 'fca',
    ManagedBy: 'cdk-pipelines',
  },
});

app.synth();
