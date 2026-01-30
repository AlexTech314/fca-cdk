#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { PipelineStack } from '../lib/pipeline-stack';

const app = new cdk.App();

// Pipeline configuration - update these values for your environment
const pipelineConfig = {
  // Your GitHub repository in the format 'owner/repo'
  repositoryName: app.node.tryGetContext('repositoryName') || 'OWNER/fca-cdk',
  
  // The branch to deploy from
  branchName: app.node.tryGetContext('branchName') || 'main',
  
  // The ARN of the CodeStar connection for GitHub
  // Create this in the AWS Console: Developer Tools > Settings > Connections
  connectionArn: app.node.tryGetContext('connectionArn') || 'arn:aws:codestar-connections:REGION:ACCOUNT:connection/CONNECTION_ID',
};

// Pipeline stack - this is the only stack you deploy manually (once)
new PipelineStack(app, 'FcaPipelineStack', {
  repositoryName: pipelineConfig.repositoryName,
  branchName: pipelineConfig.branchName,
  connectionArn: pipelineConfig.connectionArn,
  
  // Specify the environment for the pipeline itself
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  
  // Optional: Add tags
  tags: {
    Project: 'fca',
    ManagedBy: 'cdk-pipelines',
  },
});

app.synth();
