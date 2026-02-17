import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import { Construct } from 'constructs';
import * as path from 'path';
import { ecrNode20Slim } from '../ecr-images';

export interface LeadGenPipelineStackProps extends cdk.StackProps {
  readonly vpc: ec2.IVpc;
  readonly database: rds.IDatabaseInstance;
  readonly databaseSecret: secretsmanager.ISecret;
  readonly pipelineSecurityGroup: ec2.ISecurityGroup;
  readonly campaignDataBucket: s3.IBucket;
}

/**
 * Lead Generation Pipeline Stack (stateless).
 *
 * Contains: SQS queues, Bridge Lambda, ECS Fargate task defs,
 * Step Functions state machine, Scoring Lambda.
 */
export class LeadGenPipelineStack extends cdk.Stack {
  public readonly startPlacesLambdaArn: string;

  constructor(scope: Construct, id: string, props: LeadGenPipelineStackProps) {
    super(scope, id, props);

    const { vpc, database, databaseSecret, pipelineSecurityGroup, campaignDataBucket } = props;

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
        { file: 'lambda/bridge/Dockerfile' }
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
    // Prepare Scrape Lambda
    // ============================================================
    const prepareScrapeLogGroup = new logs.LogGroup(this, 'PrepareScrapeLogs', {
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const prepareScrapeLambda = new lambda.DockerImageFunction(this, 'PrepareScrape', {
      code: lambda.DockerImageCode.fromImageAsset(
        path.join(__dirname, '../../src'),
        {
          file: 'lambda/prepare-scrape/Dockerfile',
          buildArgs: { NODE_20_SLIM: node20Slim },
        }
      ),
      timeout: cdk.Duration.minutes(5),
      memorySize: 512,
      logGroup: prepareScrapeLogGroup,
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [pipelineSecurityGroup],
      environment: {
        DATABASE_SECRET_ARN: databaseSecret.secretArn,
        DATABASE_HOST: databaseEndpoint,
        CAMPAIGN_DATA_BUCKET: campaignDataBucket.bucketName,
      },
    });

    campaignDataBucket.grantWrite(prepareScrapeLambda);
    databaseSecret.grantRead(prepareScrapeLambda);

    // ============================================================
    // Aggregate Scrape Lambda
    // ============================================================
    const aggregateScrapeLogGroup = new logs.LogGroup(this, 'AggregateScrapeLogs', {
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const aggregateScrapeLambda = new lambda.DockerImageFunction(this, 'AggregateScrape', {
      code: lambda.DockerImageCode.fromImageAsset(
        path.join(__dirname, '../../src'),
        {
          file: 'lambda/aggregate-scrape/Dockerfile',
          buildArgs: { NODE_20_SLIM: node20Slim },
        }
      ),
      timeout: cdk.Duration.minutes(5),
      memorySize: 512,
      logGroup: aggregateScrapeLogGroup,
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [pipelineSecurityGroup],
      environment: {
        DATABASE_SECRET_ARN: databaseSecret.secretArn,
        DATABASE_HOST: databaseEndpoint,
        CAMPAIGN_DATA_BUCKET: campaignDataBucket.bucketName,
      },
    });

    campaignDataBucket.grantRead(aggregateScrapeLambda);
    databaseSecret.grantRead(aggregateScrapeLambda);

    // ============================================================
    // Step Functions: Distributed Scrape Workflow
    // ============================================================

    // Step 1: Prepare (write batch manifest to S3)
    const prepareScrape = new tasks.LambdaInvoke(this, 'PrepareScrapeStep', {
      lambdaFunction: prepareScrapeLambda,
      resultPath: '$.prepareResult',
    });

    // Step 2: Distributed Map (scrape in parallel)
    const runScrapeTask = new tasks.EcsRunTask(this, 'RunScrapeTask', {
      integrationPattern: sfn.IntegrationPattern.RUN_JOB,
      cluster,
      taskDefinition: scrapeTaskDef,
      launchTarget: new tasks.EcsFargateLaunchTarget({
        platformVersion: ecs.FargatePlatformVersion.LATEST,
      }),
      containerOverrides: [{
        containerDefinition: scrapeTaskDef.defaultContainer!,
        environment: [
          { name: 'JOB_INPUT', value: sfn.JsonPath.stringAt('States.JsonToString($)') },
        ],
      }],
      subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [pipelineSecurityGroup],
      resultPath: sfn.JsonPath.DISCARD,
    });

    const distributedScrape = new sfn.DistributedMap(this, 'DistributedScrape', {
      maxConcurrency: 30,
      mapExecutionType: sfn.StateMachineType.EXPRESS,
      itemReader: new sfn.S3JsonItemReader({
        bucketNamePath: sfn.JsonPath.stringAt('$.prepareResult.Payload.bucket'),
        key: sfn.JsonPath.stringAt('$.prepareResult.Payload.manifestS3Key'),
      }),
      resultWriterV2: new sfn.ResultWriterV2({
        bucket: campaignDataBucket,
        prefix: 'jobs/scrape-results/',
      }),
      toleratedFailurePercentage: 10,
    });

    distributedScrape.itemProcessor(runScrapeTask);

    // Step 3: Aggregate
    const aggregateScrape = new tasks.LambdaInvoke(this, 'AggregateScrapeStep', {
      lambdaFunction: aggregateScrapeLambda,
      resultPath: '$.scrapeResult',
    });

    // Chain: Prepare -> Distributed Map -> Aggregate
    const scrapeWorkflow = prepareScrape
      .next(distributedScrape)
      .next(aggregateScrape)
      .next(new sfn.Succeed(this, 'ScrapeComplete'));

    const stateMachine = new sfn.StateMachine(this, 'ScrapeStateMachine', {
      definitionBody: sfn.DefinitionBody.fromChainable(scrapeWorkflow),
      timeout: cdk.Duration.hours(2),
      tracingEnabled: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Tag for cost allocation
    cdk.Tags.of(stateMachine).add('project', 'fca-leadgen');
    cdk.Tags.of(stateMachine).add('pipeline-stage', 'scrape');

    // ============================================================
    // Scoring Lambda (consumes SQS, calls Claude)
    // ============================================================
    const scoringLambdaLogGroup = new logs.LogGroup(this, 'ScoringLambdaLogs', {
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const scoringLambda = new lambda.DockerImageFunction(this, 'ScoringLambda', {
      code: lambda.DockerImageCode.fromImageAsset(
        path.join(__dirname, '../../src'),
        {
          file: 'lambda/score-leads/Dockerfile',
          buildArgs: { NODE_20_SLIM: node20Slim },
        }
      ),
      timeout: cdk.Duration.minutes(3),
      memorySize: 256,
      logGroup: scoringLambdaLogGroup,
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [pipelineSecurityGroup],
      environment: {
        DATABASE_SECRET_ARN: databaseSecret.secretArn,
        DATABASE_HOST: databaseEndpoint,
        CLAUDE_API_KEY: claudeApiKey.secretValue.unsafeUnwrap(),
      },
      // No reservedConcurrentExecutions: account must keep ≥10 unreserved; use SQS batch size to limit rate
    });

    // SQS event source (batch of 10)
    scoringLambda.addEventSource(
      new lambdaEventSources.SqsEventSource(scoringQueue, {
        batchSize: 10,
        maxBatchingWindow: cdk.Duration.seconds(30),
      })
    );

    databaseSecret.grantRead(scoringLambda);

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

    new cdk.CfnOutput(this, 'RdsLambdaRoleArn', {
      value: rdsLambdaRole.roleArn,
      description: 'IAM Role ARN to attach to RDS for Lambda invocation',
    });

    new cdk.CfnOutput(this, 'StateMachineArn', {
      value: stateMachine.stateMachineArn,
      description: 'Step Functions state machine ARN',
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
