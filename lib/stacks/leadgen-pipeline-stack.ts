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
  readonly scrapeQueue: sqs.IQueue;
  readonly scoringQueue: sqs.IQueue;
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
  public readonly pipelineClusterArn: string;

  constructor(scope: Construct, id: string, props: LeadGenPipelineStackProps) {
    super(scope, id, props);

    const { vpc, database, databaseSecret, pipelineSecurityGroup, campaignDataBucket, scrapeQueue, scoringQueue } = props;

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

    const provider = TokenInjectableDockerBuilderProvider.getOrCreate(this);
    const node20Slim = ecrNodeSlim(this.account, this.region);
    const baseImage = `${this.account}.dkr.ecr.${this.region}.amazonaws.com/ghcr/puppeteer/puppeteer:24.0.0`;

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
        maxBatchingWindow: cdk.Duration.seconds(30),
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
          `arn:aws:bedrock:${this.region}::foundation-model/anthropic.claude-sonnet-4-6`,
        ],
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
        maxBatchingWindow: cdk.Duration.seconds(60),
        maxConcurrency: 2, // AWS minimum; keeps scoring throughput low for Claude rate limits
      })
    );

    scoringTaskDef.grantRun(scoringTriggerLambda);
    campaignDataBucket.grantWrite(scoringTriggerLambda);
    databaseSecret.grantRead(scoringTriggerLambda);

    this.scoringQueue = scoringQueue;

    // ============================================================
    // Outputs
    // ============================================================
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
