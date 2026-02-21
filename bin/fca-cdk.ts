#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { PipelineStack } from '../lib/pipeline-stack';
import { EcrCacheStack } from '../lib/stacks/ecr-cache-stack';
import { DnsStack } from '../lib/stacks/dns-stack';

const app = new cdk.App();

const env = {
  account: app.node.getContext('account') as string,
  region: app.node.getContext('region') as string,
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
// DNS Stack - Standalone Route 53 hosted zone
// ============================================================
//
// Deploy manually: npx cdk deploy FcaDns
// Then update your domain registrar's nameservers to the output NS records.
//
new DnsStack(app, 'FcaDns', {
  env,
  domainName: app.node.getContext('domainName') as string,
});

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
  repositoryName: app.node.getContext('repositoryName') as string,
  branchName: app.node.getContext('branchName') as string,
  connectionArn: app.node.getContext('connectionArn') as string,
  viteCognitoUserPoolId: app.node.getContext('viteCognitoUserPoolId') as string,
  viteCognitoClientId: app.node.getContext('viteCognitoClientId') as string,
  viteCognitoDomain: app.node.getContext('viteCognitoDomain') as string,
  env,
  tags: {
    Project: 'fca',
    ManagedBy: 'cdk-pipelines',
  },
});

app.synth();
