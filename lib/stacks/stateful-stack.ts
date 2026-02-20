import * as cr from 'aws-cdk-lib/custom-resources';
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import * as path from 'path';
import { TokenInjectableDockerBuilder, TokenInjectableDockerBuilderProvider } from 'token-injectable-docker-builder';
import { ecrNode20Slim } from '../ecr-images';

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
            // TODO: Add production lead-gen-spa CloudFront origin when DNS is configured
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

    // ============================================================
    // Seed DB Lambda (invoke to wipe/migrate/seed the database)
    // ============================================================
    const provider = TokenInjectableDockerBuilderProvider.getOrCreate(this);
    const seedDbImage = new TokenInjectableDockerBuilder(this, 'SeedDbImage', {
      path: path.join(__dirname, '../../src'),
      file: 'lambda/seed-db/Dockerfile',
      platform: 'linux/arm64',
      provider,
      vpc,
      subnetSelection: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      buildArgs: { NODE_20_SLIM: ecrNode20Slim(this.account, this.region) },
      ecrPullThroughCachePrefixes: ['docker-hub', 'ghcr'],
    });

    const seedLambdaLogGroup = new logs.LogGroup(this, 'SeedDbLogs', {
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const seedLambda = new lambda.DockerImageFunction(this, 'SeedDbLambda', {
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

    this.databaseSecret.grantRead(seedLambda);

    if (cognitoUserPoolId) {
      seedLambda.addToRolePolicy(
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
    const migratePayload = JSON.stringify({ action: 'migrate' });
    const migrateCustomResource = new cr.AwsCustomResource(this, 'SeedDbMigrate', {
      onCreate: {
        service: 'Lambda',
        action: 'invoke',
        parameters: {
          FunctionName: seedLambda.functionName,
          InvocationType: 'RequestResponse',
          Payload: migratePayload,
        },
        physicalResourceId: cr.PhysicalResourceId.of('SeedDbMigrate'),
      },
      onUpdate: {
        service: 'Lambda',
        action: 'invoke',
        parameters: {
          FunctionName: seedLambda.functionName,
          InvocationType: 'RequestResponse',
          Payload: migratePayload,
        },
        physicalResourceId: cr.PhysicalResourceId.of('SeedDbMigrate'),
      },
      policy: cr.AwsCustomResourcePolicy.fromStatements([
        new iam.PolicyStatement({
          actions: ['lambda:InvokeFunction'],
          resources: [seedLambda.functionArn],
        }),
      ]),
      timeout: cdk.Duration.minutes(11),
      installLatestAwsSdk: false,
    });
    migrateCustomResource.node.addDependency(seedLambda);

    // ============================================================
    // Outputs
    // ============================================================
    new cdk.CfnOutput(this, 'SeedDbLambdaArn', {
      value: seedLambda.functionArn,
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
  }
}
