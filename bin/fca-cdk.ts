#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { PipelineStack } from '../lib/pipeline-stack';
import { EcrCacheStack } from '../lib/stacks/ecr-cache-stack';
import { DnsStack } from '../lib/stacks/dns-stack';

const app = new cdk.App();

// Environment configuration
const env = {
  account: '166763268311',
  region: 'us-east-2',
};

// Pipeline configuration from cdk.json context
const pipelineConfig = {
  repositoryName: app.node.getContext('repositoryName'),
  branchName: app.node.getContext('branchName'),
  connectionArn: app.node.getContext('connectionArn'),
  notificationEmails: app.node.tryGetContext('pipelineNotificationEmails') as string[] | undefined,
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
new DnsStack(app, 'FcaDns', { env });

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
  notificationEmails: pipelineConfig.notificationEmails,
  env,
  tags: {
    Project: 'fca',
    ManagedBy: 'cdk-pipelines',
  },
});

app.synth();
