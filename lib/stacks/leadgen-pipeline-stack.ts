import * as cr from 'aws-cdk-lib/custom-resources';
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import { Construct } from 'constructs';
import * as path from 'path';
import { TokenInjectableDockerBuilder, TokenInjectableDockerBuilderProvider } from 'token-injectable-docker-builder';
import { ecrNodeSlim } from '../ecr-images';

export interface LeadGenPipelineStackProps extends cdk.StackProps {
  readonly vpc: ec2.IVpc;
  readonly database: rds.IDatabaseInstance;
  readonly databaseSecret: secretsmanager.ISecret;
  readonly pipelineSecurityGroup: ec2.ISecurityGroup;
  readonly campaignDataBucket: s3.IBucket;
  /** Seed DB Lambda (for configure-bridge after deploy) */
  readonly seedLambda: lambda.IFunction;
}

/**
 * Lead Generation Pipeline Stack (stateless).
 *
 * Contains: SQS queues, Bridge Lambda, ECS Fargate task defs,
 * Step Functions state machine, Scoring Lambda.
 */
export class LeadGenPipelineStack extends cdk.Stack {
  public readonly startPlacesLambdaArn: string;
  public readonly scoringQueue: sqs.IQueue;
  public readonly scrapeQueueUrl: string;
  public readonly scrapeQueueArn: string;
  public readonly pipelineClusterArn: string;

  constructor(scope: Construct, id: string, props: LeadGenPipelineStackProps) {
    super(scope, id, props);

    const { vpc, database, databaseSecret, pipelineSecurityGroup, campaignDataBucket, seedLambda } = props;

    // Direct RDS connection (no proxy -- saves $21.90/mo, peak ~40 connections vs ~80 limit)
    const databaseEndpoint = database.dbInstanceEndpointAddress;

    // ============================================================
    // Secrets
    // ============================================================
    const googleApiKey = secretsmanager.Secret.fromSecretNameV2(
      this, 'GoogleApiKey', 'fca/GOOGLE_API_KEY'
    );

    // Pipeline SG and RDS ingress live in StatefulStack to avoid cross-stack SecurityGroupIngress CREATE_FAILED

    // ============================================================
    // ECS Cluster
    // ============================================================
    const cluster = new ecs.Cluster(this, 'PipelineCluster', { vpc });
    this.pipelineClusterArn = cluster.clusterArn;

    // ============================================================
    // SQS Queues (with DLQs, encryption, SSL enforcement)
    // ============================================================
    const scrapeDlq = new sqs.Queue(this, 'ScrapeDlq', {
      encryption: sqs.QueueEncryption.SQS_MANAGED,
      enforceSSL: true,
      retentionPeriod: cdk.Duration.days(14),
    });

    const scrapeQueue = new sqs.Queue(this, 'ScrapeQueue', {
      encryption: sqs.QueueEncryption.SQS_MANAGED,
      enforceSSL: true,
      visibilityTimeout: cdk.Duration.minutes(15),
      deadLetterQueue: { queue: scrapeDlq, maxReceiveCount: 3 },
    });

    const scoringDlq = new sqs.Queue(this, 'ScoringDlq', {
      encryption: sqs.QueueEncryption.SQS_MANAGED,
      enforceSSL: true,
      retentionPeriod: cdk.Duration.days(14),
    });

    const scoringQueue = new sqs.Queue(this, 'ScoringQueue', {
      encryption: sqs.QueueEncryption.SQS_MANAGED,
      enforceSSL: true,
      visibilityTimeout: cdk.Duration.minutes(5),
      deadLetterQueue: { queue: scoringDlq, maxReceiveCount: 3 },
    });

    const provider = TokenInjectableDockerBuilderProvider.getOrCreate(this);
    const node20Slim = ecrNodeSlim(this.account, this.region);
    const baseImage = `${this.account}.dkr.ecr.${this.region}.amazonaws.com/ghcr/puppeteer/puppeteer:24.0.0`;

    // ============================================================
    // Bridge Lambda (PG trigger -> SQS)
    // ============================================================
    const bridgeImage = new TokenInjectableDockerBuilder(this, 'BridgeImage', {
      path: path.join(__dirname, '../../src'),
      file: 'lambda/bridge/Dockerfile',
      platform: 'linux/arm64',
      provider,
      buildArgs: { NODE_20_SLIM: node20Slim },
      ecrPullThroughCachePrefixes: ['docker-hub', 'ghcr'],
      retainBuildLogs: true,
    });

    const bridgeLambdaLogGroup = new logs.LogGroup(this, 'BridgeLambdaLogs', {
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const bridgeLambda = new lambda.DockerImageFunction(this, 'BridgeLambda', {
      code: bridgeImage.dockerImageCode,
      architecture: lambda.Architecture.ARM_64,
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      logGroup: bridgeLambdaLogGroup,
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [pipelineSecurityGroup],
      environment: {
        SCRAPE_QUEUE_URL: scrapeQueue.queueUrl,
        SCORING_QUEUE_URL: scoringQueue.queueUrl,
        DATABASE_SECRET_ARN: databaseSecret.secretArn,
        DATABASE_HOST: databaseEndpoint,
      },
    });

    scrapeQueue.grantSendMessages(bridgeLambda);
    scoringQueue.grantSendMessages(bridgeLambda);
    databaseSecret.grantRead(bridgeLambda);

    // ============================================================
    // Configure Bridge Lambda ARN in RDS (for PG triggers)
    // ============================================================
    const configureBridgePayload = JSON.stringify({
      action: 'configure-bridge',
      bridgeLambdaArn: bridgeLambda.functionArn,
      awsRegion: this.region,
    });
    const configureBridgeSalt = Date.now().toString();
    const configureBridgeResource = new cr.AwsCustomResource(this, 'ConfigureBridgeLambda', {
      onCreate: {
        service: 'Lambda',
        action: 'invoke',
        parameters: {
          FunctionName: seedLambda.functionName,
          InvocationType: 'RequestResponse',
          Payload: configureBridgePayload,
        },
        physicalResourceId: cr.PhysicalResourceId.of(`ConfigureBridgeLambda-${configureBridgeSalt}`),
      },
      onUpdate: {
        service: 'Lambda',
        action: 'invoke',
        parameters: {
          FunctionName: seedLambda.functionName,
          InvocationType: 'RequestResponse',
          Payload: configureBridgePayload,
        },
        physicalResourceId: cr.PhysicalResourceId.of(`CBL-${configureBridgeSalt}`),
      },
      policy: cr.AwsCustomResourcePolicy.fromStatements([
        new iam.PolicyStatement({
          actions: ['lambda:InvokeFunction'],
          resources: [seedLambda.functionArn],
        }),
      ]),
      timeout: cdk.Duration.minutes(2),
      installLatestAwsSdk: false,
    });
    configureBridgeResource.node.addDependency(bridgeLambda);

    // ============================================================
    // Places Ingestion Fargate Task
    // ============================================================
    const placesImage = new TokenInjectableDockerBuilder(this, 'PlacesImage', {
      path: path.join(__dirname, '../../src'),
      file: 'pipeline/places-task/Dockerfile',
      platform: 'linux/arm64',
      provider,
      buildArgs: { NODE_20_SLIM: node20Slim },
      ecrPullThroughCachePrefixes: ['docker-hub', 'ghcr'],
      retainBuildLogs: true,
    });

    const placesTaskDef = new ecs.FargateTaskDefinition(this, 'PlacesTaskDef', {
      memoryLimitMiB: 512,
      cpu: 256,
      runtimePlatform: {
        cpuArchitecture: ecs.CpuArchitecture.ARM64,
        operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
      },
    });

    placesTaskDef.addContainer('places', {
      image: placesImage.containerImage,
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'places',
        logRetention: logs.RetentionDays.ONE_WEEK,
      }),
      secrets: {
        GOOGLE_API_KEY: ecs.Secret.fromSecretsManager(googleApiKey),
      },
      environment: {
        CAMPAIGN_DATA_BUCKET: campaignDataBucket.bucketName,
        DATABASE_SECRET_ARN: databaseSecret.secretArn,
        DATABASE_HOST: databaseEndpoint,
        AWS_REGION: this.region,
      },
    });

    campaignDataBucket.grantRead(placesTaskDef.taskRole);
    databaseSecret.grantRead(placesTaskDef.taskRole);

    // ============================================================
    // Start Places Lambda (invoked by API when campaign run starts)
    // ============================================================
    const startPlacesImage = new TokenInjectableDockerBuilder(this, 'StartPlacesImage', {
      path: path.join(__dirname, '../../src'),
      file: 'lambda/start-places/Dockerfile',
      platform: 'linux/arm64',
      provider,
      buildArgs: { NODE_20_SLIM: node20Slim },
      ecrPullThroughCachePrefixes: ['docker-hub', 'ghcr'],
      retainBuildLogs: true,
    });

    const startPlacesLogGroup = new logs.LogGroup(this, 'StartPlacesLogs', {
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const startPlacesLambda = new lambda.DockerImageFunction(this, 'StartPlaces', {
      code: startPlacesImage.dockerImageCode,
      architecture: lambda.Architecture.ARM_64,
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      logGroup: startPlacesLogGroup,
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [pipelineSecurityGroup],
      environment: {
        DATABASE_SECRET_ARN: databaseSecret.secretArn,
        DATABASE_HOST: databaseEndpoint,
        CLUSTER_ARN: cluster.clusterArn,
        PLACES_TASK_DEF_ARN: placesTaskDef.taskDefinitionArn,
        SUBNETS: vpc.selectSubnets({ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }).subnetIds.join(','),
        SECURITY_GROUPS: pipelineSecurityGroup.securityGroupId,
      },
    });

    placesTaskDef.grantRun(startPlacesLambda);
    databaseSecret.grantRead(startPlacesLambda);

    this.startPlacesLambdaArn = startPlacesLambda.functionArn;

    // ============================================================
    // Scrape Fargate Task (x86 - Puppeteer/Chromium)
    // ============================================================
    const scrapeImage = new TokenInjectableDockerBuilder(this, 'ScrapeImage', {
      path: path.join(__dirname, '../../src'),
      file: 'pipeline/scrape-task/Dockerfile',
      platform: 'linux/amd64',
      provider,
      buildArgs: {
        BASE_IMAGE: baseImage,
        NODE_20_SLIM: node20Slim,
      },
      ecrPullThroughCachePrefixes: ['docker-hub', 'ghcr'],
      retainBuildLogs: true,
    });

    const scrapeTaskDef = new ecs.FargateTaskDefinition(this, 'ScrapeTaskDef', {
      memoryLimitMiB: 4096,
      cpu: 1024,
      runtimePlatform: {
        cpuArchitecture: ecs.CpuArchitecture.X86_64,
        operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
      },
    });

    scrapeTaskDef.addContainer('scrape', {
      image: scrapeImage.containerImage,
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'scrape',
        logRetention: logs.RetentionDays.ONE_WEEK,
      }),
      environment: {
        CAMPAIGN_DATA_BUCKET: campaignDataBucket.bucketName,
        DATABASE_SECRET_ARN: databaseSecret.secretArn,
        DATABASE_HOST: databaseEndpoint,
        AWS_REGION: this.region,
      },
    });

    campaignDataBucket.grantReadWrite(scrapeTaskDef.taskRole);
    databaseSecret.grantRead(scrapeTaskDef.taskRole);

    // ============================================================
    // Scrape Trigger Lambda (consumes ScrapeQueue, runs Fargate directly)
    // ============================================================
    const scrapeTriggerImage = new TokenInjectableDockerBuilder(this, 'ScrapeTriggerImage', {
      path: path.join(__dirname, '../../src'),
      file: 'lambda/scrape-trigger/Dockerfile',
      platform: 'linux/arm64',
      provider,
      buildArgs: { NODE_20_SLIM: node20Slim },
      ecrPullThroughCachePrefixes: ['docker-hub', 'ghcr'],
      retainBuildLogs: true,
    });

    const scrapeTriggerLogGroup = new logs.LogGroup(this, 'ScrapeTriggerLogs', {
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const scrapeTriggerLambda = new lambda.DockerImageFunction(this, 'ScrapeTrigger', {
      code: scrapeTriggerImage.dockerImageCode,
      architecture: lambda.Architecture.ARM_64,
      timeout: cdk.Duration.seconds(60),
      memorySize: 256,
      logGroup: scrapeTriggerLogGroup,
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [pipelineSecurityGroup],
      environment: {
        CLUSTER_ARN: cluster.clusterArn,
        SCRAPE_TASK_DEF_ARN: scrapeTaskDef.taskDefinitionArn,
        SUBNETS: vpc.selectSubnets({ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }).subnetIds.join(','),
        SECURITY_GROUPS: pipelineSecurityGroup.securityGroupId,
        CAMPAIGN_DATA_BUCKET: campaignDataBucket.bucketName,
        DATABASE_SECRET_ARN: databaseSecret.secretArn,
        DATABASE_HOST: databaseEndpoint,
      },
    });

    scrapeTriggerLambda.addEventSource(
      new lambdaEventSources.SqsEventSource(scrapeQueue, {
        batchSize: 50,
        maxBatchingWindow: cdk.Duration.seconds(5),
        maxConcurrency: 50,
      })
    );

    scrapeTaskDef.grantRun(scrapeTriggerLambda);
    campaignDataBucket.grantWrite(scrapeTriggerLambda);
    databaseSecret.grantRead(scrapeTriggerLambda);

    // ============================================================
    // Scoring Fargate Task
    // ============================================================
    const scoringImage = new TokenInjectableDockerBuilder(this, 'ScoringImage', {
      path: path.join(__dirname, '../../src'),
      file: 'pipeline/scoring-task/Dockerfile',
      platform: 'linux/arm64',
      provider,
      buildArgs: { NODE_20_SLIM: node20Slim },
      ecrPullThroughCachePrefixes: ['docker-hub', 'ghcr'],
      retainBuildLogs: true,
    });

    const scoringTaskDef = new ecs.FargateTaskDefinition(this, 'ScoringTaskDef', {
      memoryLimitMiB: 512,
      cpu: 256,
      runtimePlatform: {
        cpuArchitecture: ecs.CpuArchitecture.ARM64,
        operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
      },
    });

    scoringTaskDef.addContainer('score', {
      image: scoringImage.containerImage,
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'scoring',
        logRetention: logs.RetentionDays.ONE_WEEK,
      }),
      environment: {
        CAMPAIGN_DATA_BUCKET: campaignDataBucket.bucketName,
        DATABASE_SECRET_ARN: databaseSecret.secretArn,
        DATABASE_HOST: databaseEndpoint,
        AWS_REGION: this.region,
      },
    });

    scoringTaskDef.taskRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: ['bedrock:InvokeModel'],
        resources: [
          `arn:aws:bedrock:${this.region}::foundation-model/anthropic.claude-3-haiku-20240307-v1:0`,
        ],
      })
    );

    scoringTaskDef.taskRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: [
          'aws-marketplace:ViewSubscriptions',
          'aws-marketplace:Subscribe',
        ],
        resources: ['*'],
      })
    );

    campaignDataBucket.grantRead(scoringTaskDef.taskRole);
    databaseSecret.grantRead(scoringTaskDef.taskRole);

    // ============================================================
    // Scoring Trigger Lambda (consumes ScoringQueue, runs Fargate)
    // ============================================================
    const scoringTriggerImage = new TokenInjectableDockerBuilder(this, 'ScoringTriggerImage', {
      path: path.join(__dirname, '../../src'),
      file: 'lambda/scoring-trigger/Dockerfile',
      platform: 'linux/arm64',
      provider,
      buildArgs: { NODE_20_SLIM: node20Slim },
      ecrPullThroughCachePrefixes: ['docker-hub', 'ghcr'],
      retainBuildLogs: true,
    });

    const scoringTriggerLogGroup = new logs.LogGroup(this, 'ScoringTriggerLogs', {
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const scoringTriggerLambda = new lambda.DockerImageFunction(this, 'ScoringTrigger', {
      code: scoringTriggerImage.dockerImageCode,
      architecture: lambda.Architecture.ARM_64,
      timeout: cdk.Duration.seconds(60),
      memorySize: 256,
      logGroup: scoringTriggerLogGroup,
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [pipelineSecurityGroup],
      environment: {
        CLUSTER_ARN: cluster.clusterArn,
        SCORING_TASK_DEF_ARN: scoringTaskDef.taskDefinitionArn,
        SUBNETS: vpc.selectSubnets({ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }).subnetIds.join(','),
        SECURITY_GROUPS: pipelineSecurityGroup.securityGroupId,
        CAMPAIGN_DATA_BUCKET: campaignDataBucket.bucketName,
        DATABASE_SECRET_ARN: databaseSecret.secretArn,
        DATABASE_HOST: databaseEndpoint,
      },
    });

    scoringTriggerLambda.addEventSource(
      new lambdaEventSources.SqsEventSource(scoringQueue, {
        batchSize: 50,
        maxBatchingWindow: cdk.Duration.seconds(5),
        maxConcurrency: 5,
      })
    );

    scoringTaskDef.grantRun(scoringTriggerLambda);
    campaignDataBucket.grantWrite(scoringTriggerLambda);
    databaseSecret.grantRead(scoringTriggerLambda);

    this.scoringQueue = scoringQueue;
    this.scrapeQueueUrl = scrapeQueue.queueUrl;
    this.scrapeQueueArn = scrapeQueue.queueArn;

    // ============================================================
    // Outputs
    // ============================================================
    new cdk.CfnOutput(this, 'ScrapeQueueUrl', {
      value: scrapeQueue.queueUrl,
      description: 'SQS scrape queue URL',
    });

    new cdk.CfnOutput(this, 'ScoringQueueUrl', {
      value: scoringQueue.queueUrl,
      description: 'SQS scoring queue URL',
    });

    new cdk.CfnOutput(this, 'BridgeLambdaArn', {
      value: bridgeLambda.functionArn,
      description: 'Bridge Lambda ARN (for RDS trigger configuration)',
    });

    new cdk.CfnOutput(this, 'PlacesTaskDefArn', {
      value: placesTaskDef.taskDefinitionArn,
      description: 'Places Fargate task definition ARN',
    });

    new cdk.CfnOutput(this, 'StartPlacesLambdaArn', {
      value: startPlacesLambda.functionArn,
      description: 'Start Places Lambda ARN (invoke from API when starting campaign run)',
    });
  }
}
