import * as cr from 'aws-cdk-lib/custom-resources';
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';
import * as path from 'path';
import { TokenInjectableDockerBuilder, TokenInjectableDockerBuilderProvider } from 'token-injectable-docker-builder';
import { ecrNodeSlim } from '../ecr-images';

export interface StatefulStackProps extends cdk.StackProps {
  readonly vpc: ec2.IVpc;
  /** Cognito User Pool ID for seed-db Lambda to create admin user (optional) */
  readonly cognitoUserPoolId?: string;
}

/**
 * Stateful resources -- RDS, S3 campaign data bucket.
 * These persist across deployments. Use terminationProtection in production.
 *
 * No RDS Proxy: peak concurrent connections ~30-40 (during scrape runs),
 * db.t4g.micro supports ~80. Saves $21.90/mo.
 */
export class StatefulStack extends cdk.Stack {
  public readonly database: rds.DatabaseInstance;
  public readonly databaseSecret: secretsmanager.ISecret;
  public readonly campaignDataBucket: s3.Bucket;
  public readonly dbSecurityGroup: ec2.SecurityGroup;
  /** SG for pipeline Lambdas/Fargate; ingress to RDS is in this stack to avoid cross-stack reference failure */
  public readonly pipelineSecurityGroup: ec2.SecurityGroup;
  /** Seed DB Lambda (migrate, seed, configure-bridge) */
  public readonly seedLambda: lambda.IFunction;
  /** SQS queues for lead pipeline (Bridge Lambda -> scrape/scoring) */
  public readonly scrapeQueue: sqs.IQueue;
  public readonly scoringQueue: sqs.IQueue;
  /** Bridge Lambda ARN (invoked by PG triggers via aws_lambda extension) */
  public readonly bridgeLambdaArn: string;

  constructor(scope: Construct, id: string, props: StatefulStackProps) {
    super(scope, id, props);

    const { vpc, cognitoUserPoolId } = props;

    // ============================================================
    // Security Group for RDS
    // ============================================================
    this.dbSecurityGroup = new ec2.SecurityGroup(this, 'DbSecurityGroup', {
      vpc,
      description: 'Security group for RDS PostgreSQL',
      allowAllOutbound: false,
    });

    // ============================================================
    // Pipeline SG + ingress to RDS (same stack = no cross-stack CREATE_FAILED)
    // ============================================================
    this.pipelineSecurityGroup = new ec2.SecurityGroup(this, 'PipelineSecurityGroup', {
      vpc,
      description: 'Security group for pipeline Lambdas and Fargate tasks',
      allowAllOutbound: true,
    });
    this.dbSecurityGroup.addIngressRule(
      this.pipelineSecurityGroup,
      ec2.Port.tcp(5432),
      'Pipeline to RDS'
    );

    // ============================================================
    // RDS PostgreSQL Instance (credentials auto-created in Secrets Manager)
    // ============================================================
    // PostgreSQL 16.12: latest 16.x available in us-east-2 (16.4 not available in this region)
    this.database = new rds.DatabaseInstance(this, 'Database', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.of('16.12', '16', { s3Import: true, s3Export: true }),
      }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MICRO),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [this.dbSecurityGroup],
      credentials: rds.Credentials.fromGeneratedSecret('postgres'),
      databaseName: 'fca_db',
      allocatedStorage: 20,
      maxAllocatedStorage: 100,
      storageEncrypted: true,
      multiAz: false, // Single AZ for dev cost savings
      backupRetention: cdk.Duration.days(7),
      deletionProtection: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      // Enable aws_lambda extension support
      parameters: {
        'shared_preload_libraries': 'pg_stat_statements',
      },
    });

    this.databaseSecret = this.database.secret!;

    // ============================================================
    // S3 Bucket for Campaign Data
    // ============================================================
    this.campaignDataBucket = new s3.Bucket(this, 'CampaignDataBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.PUT, s3.HttpMethods.GET, s3.HttpMethods.HEAD],
          allowedOrigins: [
            'http://localhost:5173', // lead-gen-spa vite dev
            'http://localhost:5174',
            'https://d13kdxtwrec818.cloudfront.net', // lead-gen-spa production
          ],
          allowedHeaders: ['*'],
          exposedHeaders: ['ETag', 'Content-Type', 'Content-Length'],
          maxAge: 3600,
        },
      ],
      lifecycleRules: [
        {
          id: 'TransitionScrapedDataToIA',
          prefix: 'scraped-data/',
          transitions: [
            {
              storageClass: s3.StorageClass.INFREQUENT_ACCESS,
              transitionAfter: cdk.Duration.days(90),
            },
          ],
        },
      ],
    });

    const provider = TokenInjectableDockerBuilderProvider.getOrCreate(this);

    // ============================================================
    // SQS Queues (Bridge Lambda -> scrape/scoring pipeline)
    // ============================================================
    const scrapeDlq = new sqs.Queue(this, 'ScrapeDlq', {
      encryption: sqs.QueueEncryption.SQS_MANAGED,
      enforceSSL: true,
      retentionPeriod: cdk.Duration.days(14),
    });
    this.scrapeQueue = new sqs.Queue(this, 'ScrapeQueue', {
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
    this.scoringQueue = new sqs.Queue(this, 'ScoringQueue', {
      encryption: sqs.QueueEncryption.SQS_MANAGED,
      enforceSSL: true,
      visibilityTimeout: cdk.Duration.minutes(5),
      deadLetterQueue: { queue: scoringDlq, maxReceiveCount: 3 },
    });

    // ============================================================
    // Bridge Lambda (PG trigger -> SQS) — deployed with database
    // ============================================================
    const bridgeImage = new TokenInjectableDockerBuilder(this, 'BridgeImage', {
      path: path.join(__dirname, '../../src'),
      file: 'lambda/bridge/Dockerfile',
      platform: 'linux/arm64',
      provider,
      retainBuildLogs: true,
    });
    const bridgeLambdaLogGroup = new logs.LogGroup(this, 'BridgeLambdaLogs', {
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    const bridgeLambda = new lambda.DockerImageFunction(this, 'BridgeLambda', {
      code: bridgeImage.dockerImageCode,
      architecture: lambda.Architecture.ARM_64,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      logGroup: bridgeLambdaLogGroup,
      environment: {
        SCRAPE_QUEUE_URL: this.scrapeQueue.queueUrl,
        SCORING_QUEUE_URL: this.scoringQueue.queueUrl,
      },
    });
    this.scrapeQueue.grantSendMessages(bridgeLambda);
    this.scoringQueue.grantSendMessages(bridgeLambda);
    this.bridgeLambdaArn = bridgeLambda.functionArn;

    // IAM Role for RDS to invoke Bridge Lambda
    const rdsLambdaRole = new iam.Role(this, 'RdsLambdaRole', {
      assumedBy: new iam.ServicePrincipal('rds.amazonaws.com'),
      description: 'Allow RDS to invoke Bridge Lambda via aws_lambda extension',
    });
    bridgeLambda.grantInvoke(rdsLambdaRole);

    // ============================================================
    // Seed DB Lambda (invoke to wipe/migrate/seed the database)
    // ============================================================
    const seedDbImage = new TokenInjectableDockerBuilder(this, 'SeedDbImage', {
      path: path.join(__dirname, '../../src'),
      file: 'lambda/seed-db/Dockerfile',
      platform: 'linux/arm64',
      provider,
      vpc,
      subnetSelection: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      buildArgs: { NODE_20_SLIM: ecrNodeSlim(this.account, this.region) },
      ecrPullThroughCachePrefixes: ['docker-hub', 'ghcr'],
      retainBuildLogs: true,
    });

    const seedLambdaLogGroup = new logs.LogGroup(this, 'SeedDbLogs', {
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.seedLambda = new lambda.DockerImageFunction(this, 'SeedDbLambda', {
      code: seedDbImage.dockerImageCode,
      architecture: lambda.Architecture.ARM_64,
      timeout: cdk.Duration.minutes(10),
      memorySize: 512,
      logGroup: seedLambdaLogGroup,
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [this.pipelineSecurityGroup],
      environment: {
        DATABASE_SECRET_ARN: this.databaseSecret.secretArn,
        DATABASE_HOST: this.database.dbInstanceEndpointAddress,
        ...(cognitoUserPoolId ? { COGNITO_USER_POOL_ID: cognitoUserPoolId } : {}),
      },
    });

    this.databaseSecret.grantRead(this.seedLambda);

    if (cognitoUserPoolId) {
      this.seedLambda.addToRolePolicy(
        new iam.PolicyStatement({
          actions: [
            'cognito-idp:AdminCreateUser',
            'cognito-idp:AdminSetUserPassword',
            'cognito-idp:AdminAddUserToGroup',
            'cognito-idp:CreateGroup',
          ],
          resources: [
            `arn:aws:cognito-idp:${this.region}:${this.account}:userpool/${cognitoUserPoolId}`,
          ],
        })
      );
    }

    // ============================================================
    // Custom resource: invoke seed-db Lambda with migrate after deploy
    // ============================================================
    // Include _deployTimestamp so CloudFormation sees a change each deploy and runs onUpdate
    const migratePayload = JSON.stringify({
      action: 'migrate',
      _deployTimestamp: Date.now(),
    });
    const migrateCustomResource = new cr.AwsCustomResource(this, 'SeedDbMigrate', {
      onCreate: {
        service: 'Lambda',
        action: 'invoke',
        parameters: {
          FunctionName: this.seedLambda.functionName,
          InvocationType: 'RequestResponse',
          Payload: migratePayload,
        },
        physicalResourceId: cr.PhysicalResourceId.of('SeedDbMigrate'),
      },
      onUpdate: {
        service: 'Lambda',
        action: 'invoke',
        parameters: {
          FunctionName: this.seedLambda.functionName,
          InvocationType: 'RequestResponse',
          Payload: migratePayload,
        },
        physicalResourceId: cr.PhysicalResourceId.of('SeedDbMigrate'),
      },
      policy: cr.AwsCustomResourcePolicy.fromStatements([
        new iam.PolicyStatement({
          actions: ['lambda:InvokeFunction'],
          resources: [this.seedLambda.functionArn],
        }),
      ]),
      timeout: cdk.Duration.minutes(11),
      installLatestAwsSdk: false,
    });
    migrateCustomResource.node.addDependency(this.seedLambda);

    // ============================================================
    // Configure Bridge Lambda ARN in RDS (for PG triggers)
    // ============================================================
    const configureBridgePayload = JSON.stringify({
      action: 'configure-bridge',
      bridgeLambdaArn: bridgeLambda.functionArn,
      awsRegion: this.region,
    });
    const configureBridgeResource = new cr.AwsCustomResource(this, 'ConfigureBridgeLambda', {
      onCreate: {
        service: 'Lambda',
        action: 'invoke',
        parameters: {
          FunctionName: this.seedLambda.functionName,
          InvocationType: 'RequestResponse',
          Payload: configureBridgePayload,
        },
        physicalResourceId: cr.PhysicalResourceId.of('ConfigureBridgeLambda'),
      },
      onUpdate: {
        service: 'Lambda',
        action: 'invoke',
        parameters: {
          FunctionName: this.seedLambda.functionName,
          InvocationType: 'RequestResponse',
          Payload: configureBridgePayload,
        },
        physicalResourceId: cr.PhysicalResourceId.of('ConfigureBridgeLambda'),
      },
      policy: cr.AwsCustomResourcePolicy.fromStatements([
        new iam.PolicyStatement({
          actions: ['lambda:InvokeFunction'],
          resources: [this.seedLambda.functionArn],
        }),
      ]),
      timeout: cdk.Duration.minutes(2),
      installLatestAwsSdk: false,
    });
    configureBridgeResource.node.addDependency(migrateCustomResource);

    // ============================================================
    // Bastion Host (SSM Session Manager — no SSH key needed)
    // ============================================================
    const bastion = new ec2.BastionHostLinux(this, 'BastionHost', {
      vpc,
      subnetSelection: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.NANO),
      machineImage: ec2.MachineImage.latestAmazonLinux2023({ cpuType: ec2.AmazonLinuxCpuType.ARM_64 }),
    });

    bastion.instance.addUserData(
      'dnf install -y postgresql16 jq',
      // Write a helper script that fetches creds and connects
      `cat > /usr/local/bin/dbconnect << 'SCRIPT'
#!/bin/bash
SECRET_ARN="${this.databaseSecret.secretArn}"
REGION="${this.region}"
SECRET=$(aws secretsmanager get-secret-value --secret-id "$SECRET_ARN" --region "$REGION" --query SecretString --output text)
export PGHOST=$(echo "$SECRET" | jq -r .host)
export PGPORT=$(echo "$SECRET" | jq -r .port)
export PGUSER=$(echo "$SECRET" | jq -r .username)
export PGPASSWORD=$(echo "$SECRET" | jq -r .password)
export PGDATABASE=$(echo "$SECRET" | jq -r .dbname)
echo "Connecting to $PGDATABASE at $PGHOST:$PGPORT as $PGUSER..."
exec psql
SCRIPT`,
      'chmod +x /usr/local/bin/dbconnect',
      // Auto-connect on interactive SSM sessions
      'echo \'[ -t 0 ] && echo "Type \\"dbconnect\\" to connect to the database." \' >> /etc/profile.d/dbconnect.sh',
    );

    this.dbSecurityGroup.addIngressRule(
      bastion.connections.securityGroups[0],
      ec2.Port.tcp(5432),
      'Bastion to RDS'
    );

    this.databaseSecret.grantRead(bastion);

    // ============================================================
    // Outputs
    // ============================================================
    new cdk.CfnOutput(this, 'BastionInstanceId', {
      value: bastion.instanceId,
      description: 'Bastion host instance ID — connect via: aws ssm start-session --target <instance-id>',
    });

    new cdk.CfnOutput(this, 'SeedDbLambdaArn', {
      value: this.seedLambda.functionArn,
      description: 'Seed DB Lambda ARN (invoke with: aws lambda invoke --function-name <arn> --payload \'{"action":"reset"}\' /dev/stdout)',
    });

    new cdk.CfnOutput(this, 'DatabaseEndpoint', {
      value: this.database.dbInstanceEndpointAddress,
      description: 'RDS PostgreSQL endpoint',
    });

    new cdk.CfnOutput(this, 'CampaignDataBucketName', {
      value: this.campaignDataBucket.bucketName,
      description: 'S3 bucket for campaign data',
    });

    new cdk.CfnOutput(this, 'BridgeLambdaArn', {
      value: this.bridgeLambdaArn,
      description: 'Bridge Lambda ARN (for RDS trigger configuration)',
    });

    new cdk.CfnOutput(this, 'RdsLambdaRoleArn', {
      value: rdsLambdaRole.roleArn,
      description: 'IAM Role ARN to attach to RDS for Lambda invocation',
    });

    new cdk.CfnOutput(this, 'ScrapeQueueUrl', {
      value: this.scrapeQueue.queueUrl,
      description: 'SQS scrape queue URL',
    });

    new cdk.CfnOutput(this, 'ScoringQueueUrl', {
      value: this.scoringQueue.queueUrl,
      description: 'SQS scoring queue URL',
    });
  }
}
