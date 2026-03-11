import * as cr from 'aws-cdk-lib/custom-resources';
import * as cdk from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigwv2int from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as servicediscovery from 'aws-cdk-lib/aws-servicediscovery';
import { Construct } from 'constructs';
import * as crypto from 'crypto';
import * as path from 'path';
import { TokenInjectableDockerBuilder, TokenInjectableDockerBuilderProvider } from 'token-injectable-docker-builder';

export interface FlagshipWebStackProps extends cdk.StackProps {
  readonly vpc: ec2.IVpc;
  // Keep temporarily for cross-stack export preservation (Deploy 1)
  readonly apiLoadBalancer: elbv2.IApplicationLoadBalancer;
  readonly apiListener: elbv2.IApplicationListener;
  readonly apiLoadBalancerDnsName: string;
  // New API Gateway props
  readonly httpApiEndpoint: string;
  readonly cloudMapNamespace: servicediscovery.INamespace;
  readonly vpcLink: apigwv2.VpcLink;
  readonly vpcLinkSecurityGroup: ec2.ISecurityGroup;
  readonly cognitoUserPoolId: string;
  readonly cognitoClientId: string;
}

/**
 * Flagship Next.js web stack — unified container serving public + admin.
 *
 * Single Fargate service behind CloudFront, sharing the ApiStack ALB.
 * Routes by X-Origin-Service header: nextjs -> unified target group.
 * /admin routes are protected by client-side Cognito auth (AuthGuard).
 *
 * Uses TokenInjectableDockerBuilder to build images at deploy time so CDK tokens
 * (ALB DNS, Cognito IDs) can be injected as Docker build args.
 */
export class FlagshipWebStack extends cdk.Stack {
  public readonly distributionDomainName: string;
  public readonly distributionId: string;
  public readonly serviceArn: string;
  public readonly nextjsClusterName: string;
  public readonly nextjsClusterArn: string;

  constructor(scope: Construct, id: string, props: FlagshipWebStackProps) {
    super(scope, id, props);

    const {
      vpc,
      apiLoadBalancer,
      apiListener,
      httpApiEndpoint,
      cloudMapNamespace,
      vpcLink,
      vpcLinkSecurityGroup,
      cognitoUserPoolId,
      cognitoClientId,
    } = props;

    const apiUrl = 'http://api.svc.local:3000/api';
    const provider = TokenInjectableDockerBuilderProvider.getOrCreate(this);

    const unifiedDockerBuilder = new TokenInjectableDockerBuilder(this, 'UnifiedDockerBuilder', {
      path: path.join(__dirname, '../../src/flagship-ui/nextjs-web'),
      file: 'Dockerfile.unified',
      platform: 'linux/arm64',
      provider,
      buildArgs: {
        API_URL: apiUrl,
        NEXT_PUBLIC_COGNITO_USER_POOL_ID: cognitoUserPoolId,
        NEXT_PUBLIC_COGNITO_CLIENT_ID: cognitoClientId,
        NEXT_PUBLIC_API_URL: '/api',
      },
      vpc,
      subnetSelection: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      retainBuildLogs: true,
    });

    // ============================================================
    // ECS Cluster
    // ============================================================
    const cluster = new ecs.Cluster(this, 'NextjsCluster', { vpc });

    // (ALB target group and listener rule removed — traffic now routes via API Gateway)

    // ============================================================
    // Fargate Service
    // ============================================================
    const logGroup = new logs.LogGroup(this, 'UnifiedLogs', {
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const taskDef = new ecs.FargateTaskDefinition(this, 'UnifiedTaskDef', {
      cpu: 256,
      memoryLimitMiB: 512,
      runtimePlatform: {
        cpuArchitecture: ecs.CpuArchitecture.ARM64,
        operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
      },
    });

    taskDef.addContainer('Unified', {
      image: unifiedDockerBuilder.containerImage,
      portMappings: [{ containerPort: 3000 }],
      environment: {
        NODE_ENV: 'production',
        API_URL: apiUrl,
      },
      logging: ecs.LogDrivers.awsLogs({ logGroup, streamPrefix: 'nextjs' }),
    });

    const service = new ecs.FargateService(this, 'UnifiedService', {
      cluster,
      taskDefinition: taskDef,
      desiredCount: 1,
      minHealthyPercent: 100,
      assignPublicIp: false,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
    });

    service.node.addDependency(unifiedDockerBuilder);
    service.connections.allowFrom(vpcLinkSecurityGroup, ec2.Port.tcp(3000), 'Allow VPC Link to Next.js');
    service.connections.allowFrom(apiLoadBalancer, ec2.Port.tcp(3000), 'Preserve ALB SG export until Deploy 2');

    // ============================================================
    // Cloud Map + HTTP API for Next.js (API Gateway migration)
    // ============================================================
    const nextjsCloudMapService = service.enableCloudMap({
      cloudMapNamespace: cloudMapNamespace,
      name: 'nextjs',
      dnsRecordType: servicediscovery.DnsRecordType.SRV,
      containerPort: 3000,
      dnsTtl: cdk.Duration.seconds(10),
    });

    const nextjsHttpApi = new apigwv2.HttpApi(this, 'NextjsHttpApi', {
      apiName: 'fca-nextjs',
      createDefaultStage: true,
    });
    nextjsHttpApi.addRoutes({
      path: '/{proxy+}',
      methods: [apigwv2.HttpMethod.ANY],
      integration: new apigwv2int.HttpServiceDiscoveryIntegration('NextjsIntegration', nextjsCloudMapService, {
        vpcLink,
      }),
    });

    const scaling = service.autoScaleTaskCount({ minCapacity: 1, maxCapacity: 4 });
    scaling.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 70,
      scaleInCooldown: cdk.Duration.seconds(120),
      scaleOutCooldown: cdk.Duration.seconds(60),
    });

    // ============================================================
    // CloudFront Origins (API Gateway HTTP APIs)
    // ============================================================
    const nextjsApiDomain = cdk.Fn.select(1, cdk.Fn.split('://', nextjsHttpApi.apiEndpoint));
    const nextjsOrigin = new origins.HttpOrigin(nextjsApiDomain, {
      protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
    });

    const apiOrigin = new origins.HttpOrigin(httpApiEndpoint, {
      protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
    });

    // 30-minute cache for public pages
    const publicCachePolicy = new cloudfront.CachePolicy(this, 'PublicCachePolicy', {
      cachePolicyName: 'FlagshipPublic30Min',
      minTtl: cdk.Duration.minutes(30),
      defaultTtl: cdk.Duration.minutes(30),
      maxTtl: cdk.Duration.minutes(30),
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
    });

    // Long cache for immutable Next.js static assets
    const staticCachePolicy = new cloudfront.CachePolicy(this, 'StaticCachePolicy', {
      cachePolicyName: 'FlagshipStaticLong',
      minTtl: cdk.Duration.days(365),
      defaultTtl: cdk.Duration.days(365),
      maxTtl: cdk.Duration.days(365),
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
    });

    // ============================================================
    // CloudFront Distribution — unified (public + admin)
    // ============================================================
    const distribution = new cloudfront.Distribution(this, 'PublicDistribution', {
      defaultBehavior: {
        origin: nextjsOrigin,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: publicCachePolicy,
      },
      additionalBehaviors: {
        '/admin/*': {
          origin: nextjsOrigin,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER,
        },
        '/api/*': {
          origin: apiOrigin,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER,
        },
        '/_next/static/*': {
          origin: nextjsOrigin,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: staticCachePolicy,
        },
      },
    });

    // ============================================================
    // CloudFront invalidation on deploy
    // ============================================================
    const invalidationTrigger = crypto.createHash('md5').update(taskDef.taskDefinitionArn).digest('hex');
    const invalidationParams = {
      DistributionId: distribution.distributionId,
      InvalidationBatch: {
        CallerReference: `inv-unified-${invalidationTrigger}`,
        Paths: { Quantity: 1, Items: ['/*'] },
      },
    };
    const invalidation = new cr.AwsCustomResource(this, 'InvalidateUnified', {
      onCreate: {
        service: 'CloudFront',
        action: 'createInvalidation',
        parameters: invalidationParams,
        physicalResourceId: cr.PhysicalResourceId.of(`inv-unified-${invalidationTrigger}`),
      },
      onUpdate: {
        service: 'CloudFront',
        action: 'createInvalidation',
        parameters: invalidationParams,
        physicalResourceId: cr.PhysicalResourceId.of(`inv-unified-${invalidationTrigger}`),
      },
      policy: cr.AwsCustomResourcePolicy.fromStatements([
        new iam.PolicyStatement({
          actions: ['cloudfront:CreateInvalidation'],
          resources: ['*'],
        }),
      ]),
    });
    invalidation.node.addDependency(distribution);

    // ============================================================
    // Outputs
    // ============================================================
    this.distributionDomainName = distribution.distributionDomainName;
    this.distributionId = distribution.distributionId;
    this.serviceArn = service.serviceArn;
    this.nextjsClusterName = cluster.clusterName;
    this.nextjsClusterArn = cluster.clusterArn;

    new cdk.CfnOutput(this, 'DistributionDomainName', {
      value: distribution.distributionDomainName,
      description: 'CloudFront domain for unified site (public + admin)',
    });
    new cdk.CfnOutput(this, 'DistributionId', {
      value: distribution.distributionId,
      description: 'CloudFront distribution ID for cache invalidation',
    });
    new cdk.CfnOutput(this, 'ServiceArn', {
      value: service.serviceArn,
      description: 'ECS service ARN for unified Next.js',
    });
    new cdk.CfnOutput(this, 'NextjsClusterName', {
      value: cluster.clusterName,
      description: 'ECS cluster name for Next.js service',
    });
    new cdk.CfnOutput(this, 'NextjsClusterArn', {
      value: cluster.clusterArn,
      description: 'ECS cluster ARN',
    });

    // Dummy outputs to preserve cross-stack exports until Deploy 2
    new cdk.CfnOutput(this, '_KeepAlbExport1', { value: apiLoadBalancer.loadBalancerDnsName });
    new cdk.CfnOutput(this, '_KeepAlbExport2', { value: apiListener.listenerArn });
  }
}
