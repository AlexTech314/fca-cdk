import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { NetworkStack } from '../stacks/network-stack';
import { StatefulStack } from '../stacks/stateful-stack';
import { LeadGenPipelineStack } from '../stacks/leadgen-pipeline-stack';
import { CognitoStack } from '../stacks/cognito-stack';
import { ApiStack } from '../stacks/api-stack';
import { LeadGenWebStack } from '../stacks/leadgen-web-stack';
import { FlagshipWebStack } from '../stacks/flagship-web-stack';

export interface FcaStageProps extends cdk.StageProps {
  // Add stage-specific configuration here
}

/**
 * The FCA application stage.
 *
 * Deploys 7 stacks in order:
 * 1. NetworkStack - Shared VPC with fck-nat
 * 2. CognitoStack - User Pool, App Client, Domain, Groups
 * 3. StatefulStack - RDS, S3, seed-db Lambda (depends on VPC, Cognito)
 * 4. LeadGenPipelineStack - SQS, Bridge Lambda, Fargate tasks (depends on Stateful)
 * 5. ApiStack - Fargate API + ALB (depends on Stateful, Pipeline, Cognito)
 * 6. LeadGenWebStack - SPA + CloudFront (depends on Api)
 * 7. FlagshipWebStack - Next.js public + admin (depends on Api, Cognito)
 */
export class FcaStage extends cdk.Stage {
  public readonly networkStack: NetworkStack;
  public readonly statefulStack: StatefulStack;
  public readonly pipelineStack: LeadGenPipelineStack;
  public readonly cognitoStack: CognitoStack;
  public readonly apiStack: ApiStack;
  public readonly webStack: LeadGenWebStack;
  public readonly flagshipWebStack: FlagshipWebStack;

  constructor(scope: Construct, id: string, props?: FcaStageProps) {
    super(scope, id, props);

    // Stack 1: Shared VPC
    this.networkStack = new NetworkStack(this, 'Network', {});

    // Stack 2: Cognito (no dependencies; created before Stateful for seed-db Lambda)
    this.cognitoStack = new CognitoStack(this, 'Cognito', {});

    // Stack 3: Stateful resources (RDS, S3)
    this.statefulStack = new StatefulStack(this, 'Stateful', {
      vpc: this.networkStack.vpc,
      cognitoUserPoolId: this.cognitoStack.userPool.userPoolId,
    });
    this.statefulStack.addDependency(this.networkStack);
    this.statefulStack.addDependency(this.cognitoStack);

    // Stack 4: Lead generation pipeline (queues, Bridge Lambda, Fargate tasks)
    this.pipelineStack = new LeadGenPipelineStack(this, 'LeadGenPipeline', {
      vpc: this.networkStack.vpc,
      database: this.statefulStack.database,
      databaseSecret: this.statefulStack.databaseSecret,
      pipelineSecurityGroup: this.statefulStack.pipelineSecurityGroup,
      campaignDataBucket: this.statefulStack.campaignDataBucket,
      seedLambda: this.statefulStack.seedLambda,
    });
    this.pipelineStack.addDependency(this.statefulStack);

    // Stack 5: API (shared by lead-gen-spa, nextjs-web)
    this.apiStack = new ApiStack(this, 'Api', {
      vpc: this.networkStack.vpc,
      databaseSecret: this.statefulStack.databaseSecret,
      databaseEndpoint: this.statefulStack.database.dbInstanceEndpointAddress,
      dbSecurityGroup: this.statefulStack.dbSecurityGroup,
      campaignDataBucket: this.statefulStack.campaignDataBucket,
      pipelineSecurityGroup: this.statefulStack.pipelineSecurityGroup,
      startPlacesLambdaArn: this.pipelineStack.startPlacesLambdaArn,
      pipelineClusterArn: this.pipelineStack.pipelineClusterArn,
      scoringQueue: this.pipelineStack.scoringQueue,
      scrapeQueueUrl: this.pipelineStack.scrapeQueueUrl,
      scrapeQueueArn: this.pipelineStack.scrapeQueueArn,
      cognitoUserPoolId: this.cognitoStack.userPool.userPoolId,
      cognitoUserPoolArn: this.cognitoStack.userPool.userPoolArn,
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

    // Stack 7: Flagship Next.js (public + admin Fargate behind CloudFront)
    this.flagshipWebStack = new FlagshipWebStack(this, 'FlagshipWeb', {
      vpc: this.networkStack.vpc,
      apiLoadBalancer: this.apiStack.loadBalancer,
      apiListener: this.apiStack.listener,
      apiLoadBalancerDnsName: this.apiStack.loadBalancerDnsName,
      cognitoUserPoolId: this.cognitoStack.userPool.userPoolId,
      cognitoClientId: this.cognitoStack.userPoolClient.userPoolClientId,
    });
    this.flagshipWebStack.addDependency(this.apiStack);
    this.flagshipWebStack.addDependency(this.cognitoStack);
  }
}
