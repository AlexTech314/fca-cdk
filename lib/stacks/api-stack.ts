import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as servicediscovery from 'aws-cdk-lib/aws-servicediscovery';
import { Construct } from 'constructs';
import * as path from 'path';
import { TokenInjectableDockerBuilder, TokenInjectableDockerBuilderProvider } from 'token-injectable-docker-builder';
import { ecrNodeSlim } from '../ecr-images';

export interface ApiStackProps extends cdk.StackProps {
  readonly vpc: ec2.IVpc;
  readonly databaseSecret: secretsmanager.ISecret;
  readonly databaseEndpoint: string;
  readonly dbSecurityGroup: ec2.ISecurityGroup;
  readonly campaignDataBucket: s3.IBucket;
  readonly pipelineSecurityGroup: ec2.ISecurityGroup;
  readonly startPlacesLambdaArn: string;
  readonly pipelineClusterArn: string;
  readonly scoringQueue?: sqs.IQueue;
  readonly scrapeQueueUrl?: string;
  readonly scrapeQueueArn?: string;
  readonly cognitoUserPoolId: string;
  readonly cognitoUserPoolArn: string;
  readonly cognitoClientId: string;
}

/**
 * Shared API stack - Express API on Fargate behind ALB.
 *
 * Used by lead-gen-spa, nextjs-web (admin + public), and other UIs.
 */
export class ApiStack extends cdk.Stack {
  public readonly loadBalancer: elbv2.IApplicationLoadBalancer;
  public readonly loadBalancerDnsName: string;
  public readonly listener: elbv2.IApplicationListener;
  public readonly httpApiEndpoint: string;
  public readonly cloudMapNamespace: servicediscovery.INamespace;
  public readonly vpcLink: apigwv2.VpcLink;
  public readonly vpcLinkSecurityGroup: ec2.ISecurityGroup;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const {
      vpc,
      databaseSecret,
      databaseEndpoint,
      dbSecurityGroup,
      campaignDataBucket,
      pipelineSecurityGroup,
      startPlacesLambdaArn,
      pipelineClusterArn,
      scoringQueue,
      scrapeQueueUrl,
      scrapeQueueArn,
      cognitoUserPoolId,
      cognitoUserPoolArn,
      cognitoClientId,
    } = props;

    // Cost management config from cdk.json context (deployed via top-level FcaCostManagement stack)
    const athenaWorkGroupName = this.node.tryGetContext('athenaWorkGroupName') as string || '';
    const glueDatabaseName = this.node.tryGetContext('glueDatabaseName') as string || '';
    const glueTableName = this.node.tryGetContext('glueTableName') as string || '';
    const curBucketName = this.node.tryGetContext('curBucketName') as string || '';
    const curBucketArn = this.node.tryGetContext('curBucketArn') as string || '';
    const athenaResultsBucketName = this.node.tryGetContext('athenaResultsBucketName') as string || '';
    const athenaResultsBucketArn = this.node.tryGetContext('athenaResultsBucketArn') as string || '';

    const assetsBucket = s3.Bucket.fromBucketName(this, 'AssetsBucket', 'fca-assets-113862367661');

    const cluster = new ecs.Cluster(this, 'ApiCluster', { vpc });

    const provider = TokenInjectableDockerBuilderProvider.getOrCreate(this);
    const apiImage = new TokenInjectableDockerBuilder(this, 'ApiImage', {
      path: path.join(__dirname, '../../src'),
      file: 'api/Dockerfile',
      platform: 'linux/arm64',
      provider,
      buildArgs: { NODE_20_SLIM: ecrNodeSlim(this.account, this.region) },
      ecrPullThroughCachePrefixes: ['docker-hub', 'ghcr'],
      retainBuildLogs: true,
    });

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
        image: apiImage.containerImage,
        containerPort: 3000,
        environment: {
          NODE_ENV: 'production',
          DATABASE_HOST: databaseEndpoint,
          CAMPAIGN_DATA_BUCKET: campaignDataBucket.bucketName,
          ASSETS_BUCKET_NAME: assetsBucket.bucketName,
          CDN_DOMAIN: 'd1bjh7dvpwoxii.cloudfront.net',
          START_PLACES_LAMBDA_ARN: startPlacesLambdaArn,
          PIPELINE_CLUSTER_ARN: pipelineClusterArn,
          SCORING_QUEUE_URL: scoringQueue?.queueUrl ?? '',
          SCRAPE_QUEUE_URL: scrapeQueueUrl ?? '',
          COGNITO_USER_POOL_ID: cognitoUserPoolId,
          COGNITO_CLIENT_ID: cognitoClientId,
          AWS_REGION: this.region,
          ATHENA_WORKGROUP: athenaWorkGroupName,
          ATHENA_DATABASE: glueDatabaseName,
          ATHENA_TABLE: glueTableName,
        },
        secrets: {
          DATABASE_SECRET_ARN: ecs.Secret.fromSecretsManager(databaseSecret),
        },
        logDriver: ecs.LogDrivers.awsLogs({ logGroup: apiLogGroup, streamPrefix: 'api' }),
      },
    });

    this.loadBalancer = apiService.loadBalancer;
    this.loadBalancerDnsName = apiService.loadBalancer.loadBalancerDnsName;
    this.listener = apiService.listener;

    const scaling = apiService.service.autoScaleTaskCount({ minCapacity: 1, maxCapacity: 3 });
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
    assetsBucket.grantReadWrite(apiService.taskDefinition.taskRole);
    apiService.taskDefinition.taskRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: ['lambda:InvokeFunction'],
        resources: [startPlacesLambdaArn],
      })
    );

    if (scoringQueue) {
      scoringQueue.grantSendMessages(apiService.taskDefinition.taskRole);
    }

    if (scrapeQueueArn) {
      apiService.taskDefinition.taskRole.addToPrincipalPolicy(
        new iam.PolicyStatement({
          actions: ['sqs:SendMessage'],
          resources: [scrapeQueueArn],
        })
      );
    }

    apiService.taskDefinition.taskRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: ['ecs:StopTask'],
        resources: ['*'],
      })
    );

    apiService.taskDefinition.taskRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: [
          'cognito-idp:AdminCreateUser',
          'cognito-idp:AdminDeleteUser',
          'cognito-idp:AdminAddUserToGroup',
          'cognito-idp:AdminRemoveUserFromGroup',
          'cognito-idp:AdminGetUser',
        ],
        resources: [cognitoUserPoolArn],
      })
    );

    // Athena/Glue/S3 permissions for cost queries (only if context values are set)
    if (athenaWorkGroupName) {
      apiService.taskDefinition.taskRole.addToPrincipalPolicy(
        new iam.PolicyStatement({
          actions: [
            'athena:StartQueryExecution',
            'athena:GetQueryExecution',
            'athena:GetQueryResults',
            'athena:StopQueryExecution',
            'athena:GetWorkGroup',
          ],
          resources: [`arn:aws:athena:${this.region}:${this.account}:workgroup/${athenaWorkGroupName}`],
        })
      );
    }

    if (glueDatabaseName) {
      apiService.taskDefinition.taskRole.addToPrincipalPolicy(
        new iam.PolicyStatement({
          actions: [
            'glue:GetDatabase',
            'glue:GetTable',
            'glue:GetTables',
            'glue:GetPartition',
            'glue:GetPartitions',
          ],
          resources: [
            `arn:aws:glue:${this.region}:${this.account}:catalog`,
            `arn:aws:glue:${this.region}:${this.account}:database/${glueDatabaseName}`,
            `arn:aws:glue:${this.region}:${this.account}:table/${glueDatabaseName}/*`,
          ],
        })
      );
    }

    if (curBucketArn) {
      const curBucket = s3.Bucket.fromBucketArn(this, 'CurBucket', curBucketArn);
      curBucket.grantRead(apiService.taskDefinition.taskRole);
    }

    if (athenaResultsBucketArn) {
      const athenaResultsBucket = s3.Bucket.fromBucketArn(this, 'AthenaResultsBucket', athenaResultsBucketArn);
      athenaResultsBucket.grantReadWrite(apiService.taskDefinition.taskRole);
    }

    apiService.service.connections.allowTo(dbSecurityGroup, ec2.Port.tcp(5432), 'Allow API Fargate to RDS');

    // ============================================================
    // Cloud Map + VPC Link + HTTP API (API Gateway migration)
    // ============================================================
    const namespace = new servicediscovery.PrivateDnsNamespace(this, 'ServiceNamespace', {
      name: 'svc.local',
      vpc,
    });

    const apiCloudMapService = new servicediscovery.Service(this, 'ApiCloudMapSvc', {
      namespace,
      name: 'api',
      dnsRecordType: servicediscovery.DnsRecordType.A,
      dnsTtl: cdk.Duration.seconds(10),
    });
    apiService.service.associateCloudMapService({
      service: apiCloudMapService,
    });

    const vpcLinkSg = new ec2.SecurityGroup(this, 'VpcLinkSg', {
      vpc,
      description: 'Security group for API Gateway VPC Link',
    });
    apiService.service.connections.allowFrom(vpcLinkSg, ec2.Port.tcp(3000), 'Allow VPC Link to API');

    const vpcLink = new apigwv2.VpcLink(this, 'VpcLink', {
      vpc,
      subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [vpcLinkSg],
    });

    const httpApi = new apigwv2.HttpApi(this, 'HttpApi', {
      apiName: 'fca-api',
      createDefaultStage: true,
    });
    const apiIntegration = new apigwv2.CfnIntegration(this, 'ApiVpcIntegration', {
      apiId: httpApi.apiId,
      integrationType: 'HTTP_PROXY',
      integrationMethod: 'ANY',
      integrationUri: 'http://api.svc.local:3000',
      connectionType: 'VPC_LINK',
      connectionId: vpcLink.vpcLinkId,
      payloadFormatVersion: '1.0',
    });
    new apigwv2.CfnRoute(this, 'ApiRoute', {
      apiId: httpApi.apiId,
      routeKey: '$default',
      target: `integrations/${apiIntegration.ref}`,
    });

    this.httpApiEndpoint = cdk.Fn.select(1, cdk.Fn.split('://', httpApi.apiEndpoint));
    this.cloudMapNamespace = namespace;
    this.vpcLink = vpcLink;
    this.vpcLinkSecurityGroup = vpcLinkSg;

    new cdk.CfnOutput(this, 'ApiLoadBalancerDnsName', {
      value: this.loadBalancerDnsName,
      description: 'ALB DNS name for API (used by CloudFront, nextjs-web)',
    });

    new cdk.CfnOutput(this, 'HttpApiEndpoint', {
      value: httpApi.apiEndpoint,
      description: 'HTTP API endpoint for API (API Gateway)',
    });
  }
}
