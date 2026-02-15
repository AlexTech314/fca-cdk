import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export interface StatefulStackProps extends cdk.StackProps {
  readonly vpc: ec2.IVpc;
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

  constructor(scope: Construct, id: string, props: StatefulStackProps) {
    super(scope, id, props);

    const { vpc } = props;

    // ============================================================
    // RDS PostgreSQL Master Password (pre-created in Secrets Manager)
    // ============================================================
    this.databaseSecret = secretsmanager.Secret.fromSecretNameV2(
      this, 'RdsMasterPassword', 'fca/rds-master-password'
    );

    // ============================================================
    // Security Group for RDS
    // ============================================================
    this.dbSecurityGroup = new ec2.SecurityGroup(this, 'DbSecurityGroup', {
      vpc,
      description: 'Security group for RDS PostgreSQL',
      allowAllOutbound: false,
    });

    // ============================================================
    // RDS PostgreSQL Instance
    // ============================================================
    this.database = new rds.DatabaseInstance(this, 'Database', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_16_4,
      }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MICRO),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [this.dbSecurityGroup],
      credentials: rds.Credentials.fromSecret(this.databaseSecret),
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
    // Outputs
    // ============================================================
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
