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
import { ecrNode20Slim, ecrBuildCacheOptions } from '../ecr-images';

export interface LeadGenPipelineStackProps extends cdk.StackProps {
  readonly vpc: ec2.IVpc;
  readonly database: rds.IDatabaseInstance;
  readonly databaseSecret: secretsmanager.ISecret;
  readonly pipelineSecurityGroup: ec2.ISecurityGroup;
  readonly campaignDataBucket: s3.IBucket;
  readonly buildCacheRepoUri: string;
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

    const { vpc, database, databaseSecret, pipelineSecurityGroup, campaignDataBucket, buildCacheRepoUri } = props;
    const buildCacheOpts = ecrBuildCacheOptions(buildCacheRepoUri);

    // Direct RDS connection (no proxy -- saves $21.90/mo, peak ~40 connections vs ~80 limit)
    const databaseEndpoint = database.dbInstanceEndpointAddress;

    // ============================================================
    // Secrets
    // ============================================================
    const googleApiKey = secretsmanager.Secret.fromSecretNameV2(
      this, 'GoogleApiKey', 'fca/GOOGLE_API_KEY'
    );
    const claudeApiKey = secretsmanager.Secret.fromSecretNameV2(
      this, 'ClaudeApiKey', 'fca/CLAUDE_API_KEY'
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

    // Scrape DLQ
    const scrapeDlq = new sqs.Queue(this, 'ScrapeDlq', {
      encryption: sqs.QueueEncryption.SQS_MANAGED,
      enforceSSL: true,
      retentionPeriod: cdk.Duration.days(14),
    });

    // Scrape Queue
    const scrapeQueue = new sqs.Queue(this, 'ScrapeQueue', {
      encryption: sqs.QueueEncryption.SQS_MANAGED,
      enforceSSL: true,
      visibilityTimeout: cdk.Duration.minutes(15),
      deadLetterQueue: { queue: scrapeDlq, maxReceiveCount: 3 },
    });

    // Scoring DLQ
    const scoringDlq = new sqs.Queue(this, 'ScoringDlq', {
      encryption: sqs.QueueEncryption.SQS_MANAGED,
      enforceSSL: true,
      retentionPeriod: cdk.Duration.days(14),
    });

    // Scoring Queue
    const scoringQueue = new sqs.Queue(this, 'ScoringQueue', {
      encryption: sqs.QueueEncryption.SQS_MANAGED,
      enforceSSL: true,
      visibilityTimeout: cdk.Duration.minutes(5),
      deadLetterQueue: { queue: scoringDlq, maxReceiveCount: 3 },
    });

    // ============================================================
    // Bridge Lambda (PG trigger -> SQS)
    // ============================================================
    const bridgeLambdaLogGroup = new logs.LogGroup(this, 'BridgeLambdaLogs', {
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const bridgeLambda = new lambda.DockerImageFunction(this, 'BridgeLambda', {
      code: lambda.DockerImageCode.fromImageAsset(
        path.join(__dirname, '../../src'),
        { file: 'lambda/bridge/Dockerfile', ...buildCacheOpts }
      ),
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      logGroup: bridgeLambdaLogGroup,
      environment: {
        SCRAPE_QUEUE_URL: scrapeQueue.queueUrl,
        SCORING_QUEUE_URL: scoringQueue.queueUrl,
      },
    });

    scrapeQueue.grantSendMessages(bridgeLambda);
    scoringQueue.grantSendMessages(bridgeLambda);

    // ============================================================
    // IAM Role for RDS to invoke Bridge Lambda
    // ============================================================
    const rdsLambdaRole = new iam.Role(this, 'RdsLambdaRole', {
      assumedBy: new iam.ServicePrincipal('rds.amazonaws.com'),
      description: 'Allow RDS to invoke Bridge Lambda via aws_lambda extension',
    });

    bridgeLambda.grantInvoke(rdsLambdaRole);

    // Note: After deployment, attach this role to the RDS instance manually:
    // aws rds add-role-to-db-instance \
    //   --db-instance-identifier <instance-id> \
    //   --role-arn <rds-lambda-role-arn> \
    //   --feature-name Lambda

    // ============================================================
    // Places Ingestion Fargate Task
    // ============================================================
    const placesTaskDef = new ecs.FargateTaskDefinition(this, 'PlacesTaskDef', {
      memoryLimitMiB: 512,
      cpu: 256,
    });

    const node20Slim = ecrNode20Slim(this.account, this.region);
    placesTaskDef.addContainer('places', {
      image: ecs.ContainerImage.fromAsset(
        path.join(__dirname, '../../src'),
        {
          file: 'pipeline/places-task/Dockerfile',
          buildArgs: { NODE_20_SLIM: node20Slim },
          ...buildCacheOpts,
        }
      ),
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
    const startPlacesLogGroup = new logs.LogGroup(this, 'StartPlacesLogs', {
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const startPlacesLambda = new lambda.DockerImageFunction(this, 'StartPlaces', {
      code: lambda.DockerImageCode.fromImageAsset(
        path.join(__dirname, '../../src'),
        {
          file: 'lambda/start-places/Dockerfile',
          buildArgs: { NODE_20_SLIM: node20Slim },
          ...buildCacheOpts,
        }
      ),
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
    // Scrape Fargate Task
    // ============================================================
    const scrapeTaskDef = new ecs.FargateTaskDefinition(this, 'ScrapeTaskDef', {
      memoryLimitMiB: 4096,
      cpu: 1024,
    });

    // ECR pull-through cache base images (must deploy EcrCache stack first)
    const baseImage = `${this.account}.dkr.ecr.${this.region}.amazonaws.com/ghcr/puppeteer/puppeteer:24.0.0`;

    scrapeTaskDef.addContainer('scrape', {
      image: ecs.ContainerImage.fromAsset(
        path.join(__dirname, '../../src'),
        {
          file: 'pipeline/scrape-task/Dockerfile',
          buildArgs: {
            BASE_IMAGE: baseImage,
            NODE_20_SLIM: node20Slim,
          },
          ...buildCacheOpts,
        }
      ),
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
    const scrapeTriggerLogGroup = new logs.LogGroup(this, 'ScrapeTriggerLogs', {
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const scrapeTriggerLambda = new lambda.DockerImageFunction(this, 'ScrapeTrigger', {
      code: lambda.DockerImageCode.fromImageAsset(
        path.join(__dirname, '../../src'),
        {
          file: 'lambda/scrape-trigger/Dockerfile',
          buildArgs: { NODE_20_SLIM: node20Slim },
          ...buildCacheOpts,
        }
      ),
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
    const scoringTaskDef = new ecs.FargateTaskDefinition(this, 'ScoringTaskDef', {
      memoryLimitMiB: 512,
      cpu: 256,
    });

    scoringTaskDef.addContainer('score', {
      image: ecs.ContainerImage.fromAsset(
        path.join(__dirname, '../../src'),
        {
          file: 'pipeline/scoring-task/Dockerfile',
          buildArgs: { NODE_20_SLIM: node20Slim },
          ...buildCacheOpts,
        }
      ),
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
      secrets: {
        CLAUDE_API_KEY: ecs.Secret.fromSecretsManager(claudeApiKey),
      },
    });

    campaignDataBucket.grantRead(scoringTaskDef.taskRole);
    databaseSecret.grantRead(scoringTaskDef.taskRole);

    // ============================================================
    // Scoring Trigger Lambda (consumes ScoringQueue, runs Fargate)
    // ============================================================
    const scoringTriggerLogGroup = new logs.LogGroup(this, 'ScoringTriggerLogs', {
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const scoringTriggerLambda = new lambda.DockerImageFunction(this, 'ScoringTrigger', {
      code: lambda.DockerImageCode.fromImageAsset(
        path.join(__dirname, '../../src'),
        {
          file: 'lambda/scoring-trigger/Dockerfile',
          buildArgs: { NODE_20_SLIM: node20Slim },
          ...buildCacheOpts,
        }
      ),
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

    // ============================================================
    // Outputs
    // ============================================================
    new cdk.CfnOutput(this, 'ScrapeQueueUrl', {
      value: scrapeQueue.queueUrl,
      description: 'SQS scrape queue URL',
    });

    this.scoringQueue = scoringQueue;

    new cdk.CfnOutput(this, 'ScoringQueueUrl', {
      value: scoringQueue.queueUrl,
      description: 'SQS scoring queue URL',
    });

    new cdk.CfnOutput(this, 'BridgeLambdaArn', {
      value: bridgeLambda.functionArn,
      description: 'Bridge Lambda ARN (for RDS trigger configuration)',
    });

    new cdk.CfnOutput(this, 'RdsLambdaRoleArn', {
      value: rdsLambdaRole.roleArn,
      description: 'IAM Role ARN to attach to RDS for Lambda invocation',
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
