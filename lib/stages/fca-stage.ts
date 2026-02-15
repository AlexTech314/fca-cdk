import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { NetworkStack } from '../stacks/network-stack';
import { StatefulStack } from '../stacks/stateful-stack';
import { LeadGenPipelineStack } from '../stacks/leadgen-pipeline-stack';

export interface FcaStageProps extends cdk.StageProps {
  // Add stage-specific configuration here
}

/**
 * The FCA application stage.
 *
 * Deploys 3 stacks in order:
 * 1. NetworkStack - Shared VPC with fck-nat
 * 2. StatefulStack - RDS, S3 (depends on VPC)
 * 3. LeadGenPipelineStack - SQS, Lambdas, Fargate tasks, Step Functions (depends on VPC + Stateful)
 */
export class FcaStage extends cdk.Stage {
  public readonly networkStack: NetworkStack;
  public readonly statefulStack: StatefulStack;
  public readonly pipelineStack: LeadGenPipelineStack;

  constructor(scope: Construct, id: string, props?: FcaStageProps) {
    super(scope, id, props);

    // Stack 1: Shared VPC
    this.networkStack = new NetworkStack(this, 'Network', {});

    // Stack 2: Stateful resources (RDS, S3)
    this.statefulStack = new StatefulStack(this, 'Stateful', {
      vpc: this.networkStack.vpc,
    });
    this.statefulStack.addDependency(this.networkStack);

    // Stack 3: Lead generation pipeline (compute, queues, step functions)
    this.pipelineStack = new LeadGenPipelineStack(this, 'LeadGenPipeline', {
      vpc: this.networkStack.vpc,
      database: this.statefulStack.database,
      databaseSecret: this.statefulStack.databaseSecret,
      dbSecurityGroup: this.statefulStack.dbSecurityGroup,
      campaignDataBucket: this.statefulStack.campaignDataBucket,
    });
    this.pipelineStack.addDependency(this.statefulStack);
  }
}
