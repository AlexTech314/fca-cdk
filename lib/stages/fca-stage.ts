import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { NetworkStack } from '../stacks/network-stack';
import { StatefulStack } from '../stacks/stateful-stack';
import { LeadGenPipelineStack } from '../stacks/leadgen-pipeline-stack';
import { CognitoStack } from '../stacks/cognito-stack';
import { ApiStack } from '../stacks/api-stack';
import { LeadGenWebStack } from '../stacks/leadgen-web-stack';

export interface FcaStageProps extends cdk.StageProps {
  // Add stage-specific configuration here
}

/**
 * The FCA application stage.
 *
 * Deploys 6 stacks in order:
 * 1. NetworkStack - Shared VPC with fck-nat
 * 2. StatefulStack - RDS, S3 (depends on VPC)
 * 3. LeadGenPipelineStack - SQS, Lambdas, Fargate tasks, Step Functions (depends on VPC + Stateful)
 * 4. CognitoStack - User Pool, App Client, Domain, Groups (no dependencies)
 * 5. ApiStack - Fargate API + ALB (shared by lead-gen-spa, nextjs-web)
 * 6. LeadGenWebStack - SPA + CloudFront (depends on ApiStack)
 */
export class FcaStage extends cdk.Stage {
  public readonly networkStack: NetworkStack;
  public readonly statefulStack: StatefulStack;
  public readonly pipelineStack: LeadGenPipelineStack;
  public readonly cognitoStack: CognitoStack;
  public readonly apiStack: ApiStack;
  public readonly webStack: LeadGenWebStack;

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
      pipelineSecurityGroup: this.statefulStack.pipelineSecurityGroup,
      campaignDataBucket: this.statefulStack.campaignDataBucket,
    });
    this.pipelineStack.addDependency(this.statefulStack);

    // Stack 4: Cognito (no dependencies)
    this.cognitoStack = new CognitoStack(this, 'Cognito', {});

    // Stack 5: API (shared by lead-gen-spa, nextjs-web)
    this.apiStack = new ApiStack(this, 'Api', {
      vpc: this.networkStack.vpc,
      databaseSecret: this.statefulStack.databaseSecret,
      databaseEndpoint: this.statefulStack.database.dbInstanceEndpointAddress,
      dbSecurityGroup: this.statefulStack.dbSecurityGroup,
      campaignDataBucket: this.statefulStack.campaignDataBucket,
      pipelineSecurityGroup: this.statefulStack.pipelineSecurityGroup,
      startPlacesLambdaArn: this.pipelineStack.startPlacesLambdaArn,
      cognitoUserPoolId: this.cognitoStack.userPool.userPoolId,
      cognitoClientId: this.cognitoStack.userPoolClient.userPoolClientId,
    });
    this.apiStack.addDependency(this.statefulStack);
    this.apiStack.addDependency(this.pipelineStack);
    this.apiStack.addDependency(this.cognitoStack);

    // Stack 6: LeadGen Web (SPA + CloudFront)
    this.webStack = new LeadGenWebStack(this, 'LeadGenWeb', {
      apiLoadBalancer: this.apiStack.loadBalancer,
    });
    this.webStack.addDependency(this.apiStack);
  }
}
