import * as cdk from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as ecr_assets from 'aws-cdk-lib/aws-ecr-assets';
import { Construct } from 'constructs';
import * as path from 'path';

export interface LeadGenWebStackProps extends cdk.StackProps {
  readonly vpc: ec2.IVpc;
  readonly databaseSecret: secretsmanager.ISecret;
  readonly databaseEndpoint: string;
  readonly dbSecurityGroup: ec2.ISecurityGroup;
  readonly campaignDataBucket: s3.IBucket;
  readonly pipelineSecurityGroup: ec2.ISecurityGroup;
  readonly startPlacesLambdaArn: string;
  readonly cognitoUserPoolId: string;
  readonly cognitoClientId: string;
  readonly cognitoDomainPrefix: string;
}

/**
 * Lead-gen SPA + API web stack.
 *
 * Single CloudFront distribution: /api/* -> ALB -> Fargate API; default -> S3 (SPA).
 */
export class LeadGenWebStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: LeadGenWebStackProps) {
    super(scope, id, props);

    const {
      vpc,
      databaseSecret,
      databaseEndpoint,
      dbSecurityGroup,
      campaignDataBucket,
      pipelineSecurityGroup,
      startPlacesLambdaArn,
      cognitoUserPoolId,
      cognitoClientId,
    } = props;

    const cluster = new ecs.Cluster(this, 'ApiCluster', { vpc });

    const apiLogGroup = new logs.LogGroup(this, 'ApiLogs', {
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const apiService = new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'ApiService', {
      cluster,
      cpu: 256,
      memoryLimitMiB: 512,
      desiredCount: 1,
      minHealthyPercent: 100,
      publicLoadBalancer: true,
      assignPublicIp: false,
      taskSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      runtimePlatform: {
        cpuArchitecture: ecs.CpuArchitecture.ARM64,
        operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
      },
      taskImageOptions: {
        image: ecs.ContainerImage.fromAsset(path.join(__dirname, '../../src/api'), {
          platform: ecr_assets.Platform.LINUX_ARM64,
        }),
        containerPort: 3000,
        environment: {
          NODE_ENV: 'production',
          DATABASE_HOST: databaseEndpoint,
          CAMPAIGN_DATA_BUCKET: campaignDataBucket.bucketName,
          START_PLACES_LAMBDA_ARN: startPlacesLambdaArn,
          COGNITO_USER_POOL_ID: cognitoUserPoolId,
          COGNITO_CLIENT_ID: cognitoClientId,
          AWS_REGION: this.region,
        },
        secrets: {
          DATABASE_SECRET_ARN: ecs.Secret.fromSecretsManager(databaseSecret),
        },
        logDriver: ecs.LogDrivers.awsLogs({ logGroup: apiLogGroup, streamPrefix: 'api' }),
      },
    });

    const scaling = apiService.service.autoScaleTaskCount({ minCapacity: 1, maxCapacity: 10 });
    scaling.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 70,
      scaleInCooldown: cdk.Duration.seconds(60),
      scaleOutCooldown: cdk.Duration.seconds(60),
    });

    apiService.targetGroup.configureHealthCheck({
      path: '/api/health',
      healthyHttpCodes: '200',
    });

    databaseSecret.grantRead(apiService.taskDefinition.taskRole);
    campaignDataBucket.grantReadWrite(apiService.taskDefinition.taskRole);
    apiService.taskDefinition.taskRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: ['lambda:InvokeFunction'],
        resources: [startPlacesLambdaArn],
      })
    );

    // Use allowTo from API side so rules are created in this stack (avoids cyclic cross-stack ref)
    apiService.service.connections.allowTo(dbSecurityGroup, ec2.Port.tcp(5432), 'Allow API Fargate to RDS');

    const spaBucket = new s3.Bucket(this, 'SpaBucket', {
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(spaBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      additionalBehaviors: {
        '/api/*': {
          origin: new origins.LoadBalancerV2Origin(apiService.loadBalancer, {
            protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
          }),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER,
        },
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        { httpStatus: 403, responseHttpStatus: 200, responsePagePath: '/index.html' },
        { httpStatus: 404, responseHttpStatus: 200, responsePagePath: '/index.html' },
      ],
    });

    const cfnTaskDef = apiService.taskDefinition.node.defaultChild as ecs.CfnTaskDefinition;
    const leadgenOrigin = `https://${distribution.distributionDomainName}`;
    cfnTaskDef.addPropertyOverride('ContainerDefinitions.0.Environment', [
      { Name: 'NODE_ENV', Value: 'production' },
      { Name: 'DATABASE_HOST', Value: databaseEndpoint },
      { Name: 'CAMPAIGN_DATA_BUCKET', Value: campaignDataBucket.bucketName },
      { Name: 'START_PLACES_LAMBDA_ARN', Value: startPlacesLambdaArn },
      { Name: 'COGNITO_USER_POOL_ID', Value: cognitoUserPoolId },
      { Name: 'COGNITO_CLIENT_ID', Value: cognitoClientId },
      { Name: 'AWS_REGION', Value: this.region },
      { Name: 'LEADGEN_ORIGIN', Value: leadgenOrigin },
    ]);

    new s3deploy.BucketDeployment(this, 'DeploySpa', {
      sources: [s3deploy.Source.asset(path.join(__dirname, '../../src/lead-gen-spa/dist'))],
      destinationBucket: spaBucket,
      distribution,
      distributionPaths: ['/*'],
      cacheControl: [
        s3deploy.CacheControl.setPublic(),
        s3deploy.CacheControl.maxAge(cdk.Duration.hours(1)),
      ],
    });

    new cdk.CfnOutput(this, 'DistributionDomainName', {
      value: distribution.distributionDomainName,
      description: 'CloudFront distribution domain',
    });
    new cdk.CfnOutput(this, 'DistributionId', {
      value: distribution.distributionId,
      description: 'CloudFront distribution ID',
    });
    new cdk.CfnOutput(this, 'ApiLoadBalancerDnsName', {
      value: apiService.loadBalancer.loadBalancerDnsName,
      description: 'ALB DNS name',
    });
    new cdk.CfnOutput(this, 'SpaBucketName', {
      value: spaBucket.bucketName,
      description: 'S3 bucket for SPA assets',
    });
  }
}
