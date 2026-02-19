import * as cdk from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import * as path from 'path';
import { TokenInjectableDockerBuilder } from 'token-injectable-docker-builder';

export interface FlagshipWebStackProps extends cdk.StackProps {
  readonly vpc: ec2.IVpc;
  readonly apiLoadBalancer: elbv2.IApplicationLoadBalancer;
  readonly apiListener: elbv2.IApplicationListener;
  readonly apiLoadBalancerDnsName: string;
  readonly cognitoUserPoolId: string;
  readonly cognitoClientId: string;
}

/**
 * Flagship Next.js web stack.
 *
 * Two Fargate services (public + admin) behind CloudFront, sharing the ApiStack ALB.
 * Routes by X-Origin-Service header: public -> public target group, admin -> admin target group.
 *
 * Uses TokenInjectableDockerBuilder to build images at deploy time so CDK tokens
 * (ALB DNS, Cognito IDs) can be injected as Docker build args.
 */
export class FlagshipWebStack extends cdk.Stack {
  public readonly publicDistributionDomainName: string;
  public readonly publicDistributionId: string;
  public readonly adminDistributionDomainName: string;
  public readonly adminDistributionId: string;
  public readonly publicServiceArn: string;
  public readonly adminServiceArn: string;
  public readonly nextjsClusterName: string;
  public readonly nextjsClusterArn: string;

  constructor(scope: Construct, id: string, props: FlagshipWebStackProps) {
    super(scope, id, props);

    const {
      vpc,
      apiLoadBalancer,
      apiListener,
      apiLoadBalancerDnsName,
      cognitoUserPoolId,
      cognitoClientId,
    } = props;

    const apiUrl = `http://${apiLoadBalancerDnsName}/api`;

    // ============================================================
    // Deploy-time Docker builds (supports CDK tokens as build args)
    // ============================================================
    const publicBuildLogGroup = new logs.LogGroup(this, 'PublicBuildLogGroup', {
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const publicDockerBuilder = new TokenInjectableDockerBuilder(this, 'PublicDockerBuilder', {
      path: path.join(__dirname, '../../src/flagship-ui/nextjs-web'),
      file: 'Dockerfile.public',
      buildArgs: {
        API_URL: apiUrl,
      },
      vpc,
      subnetSelection: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      buildLogGroup: publicBuildLogGroup,
    });

    const adminBuildLogGroup = new logs.LogGroup(this, 'AdminBuildLogGroup', {
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    
    const adminDockerBuilder = new TokenInjectableDockerBuilder(this, 'AdminDockerBuilder', {
      path: path.join(__dirname, '../../src/flagship-ui/nextjs-web'),
      file: 'Dockerfile.admin',
      buildArgs: {
        API_URL: apiUrl,
        NEXT_PUBLIC_COGNITO_USER_POOL_ID: cognitoUserPoolId,
        NEXT_PUBLIC_COGNITO_CLIENT_ID: cognitoClientId,
        NEXT_PUBLIC_API_URL: '/api',
      },
      vpc,
      subnetSelection: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      buildLogGroup: adminBuildLogGroup,
    });

    // ============================================================
    // ECS Cluster
    // ============================================================
    const cluster = new ecs.Cluster(this, 'NextjsCluster', { vpc });

    // ============================================================
    // Target Groups
    // ============================================================
    const publicTargetGroup = new elbv2.ApplicationTargetGroup(this, 'PublicTargetGroup', {
      vpc,
      port: 3000,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targetType: elbv2.TargetType.IP,
      healthCheck: {
        path: '/',
        healthyHttpCodes: '200',
      },
    });

    const adminTargetGroup = new elbv2.ApplicationTargetGroup(this, 'AdminTargetGroup', {
      vpc,
      port: 3000,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targetType: elbv2.TargetType.IP,
      healthCheck: {
        path: '/admin',
        healthyHttpCodes: '200,302',
      },
    });

    // ============================================================
    // ALB Listener Rules (X-Origin-Service header routing)
    // ============================================================
    new elbv2.ApplicationListenerRule(this, 'PublicRule', {
      listener: apiListener,
      priority: 1,
      conditions: [elbv2.ListenerCondition.httpHeader('X-Origin-Service', ['public'])],
      action: elbv2.ListenerAction.forward([publicTargetGroup]),
    });

    new elbv2.ApplicationListenerRule(this, 'AdminRule', {
      listener: apiListener,
      priority: 2,
      conditions: [elbv2.ListenerCondition.httpHeader('X-Origin-Service', ['admin'])],
      action: elbv2.ListenerAction.forward([adminTargetGroup]),
    });

    // ============================================================
    // Public Fargate Service
    // ============================================================
    const publicLogGroup = new logs.LogGroup(this, 'PublicLogs', {
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const publicTaskDef = new ecs.FargateTaskDefinition(this, 'PublicTaskDef', {
      cpu: 256,
      memoryLimitMiB: 512,
      runtimePlatform: {
        cpuArchitecture: ecs.CpuArchitecture.ARM64,
        operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
      },
    });

    publicTaskDef.addContainer('Public', {
      image: publicDockerBuilder.containerImage,
      portMappings: [{ containerPort: 3000 }],
      environment: {
        NODE_ENV: 'production',
        API_URL: apiUrl,
      },
      logging: ecs.LogDrivers.awsLogs({ logGroup: publicLogGroup, streamPrefix: 'public' }),
    });

    const publicService = new ecs.FargateService(this, 'PublicService', {
      cluster,
      taskDefinition: publicTaskDef,
      desiredCount: 1,
      minHealthyPercent: 100,
      assignPublicIp: false,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
    });

    publicService.node.addDependency(publicDockerBuilder);
    publicService.attachToApplicationTargetGroup(publicTargetGroup);
    publicService.connections.allowFrom(apiLoadBalancer, ec2.Port.tcp(3000), 'Allow ALB to public Next.js');

    // ============================================================
    // Admin Fargate Service
    // ============================================================
    const adminLogGroup = new logs.LogGroup(this, 'AdminLogs', {
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const adminTaskDef = new ecs.FargateTaskDefinition(this, 'AdminTaskDef', {
      cpu: 256,
      memoryLimitMiB: 512,
      runtimePlatform: {
        cpuArchitecture: ecs.CpuArchitecture.ARM64,
        operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
      },
    });

    adminTaskDef.addContainer('Admin', {
      image: adminDockerBuilder.containerImage,
      portMappings: [{ containerPort: 3000 }],
      environment: {
        NODE_ENV: 'production',
        API_URL: apiUrl,
      },
      logging: ecs.LogDrivers.awsLogs({ logGroup: adminLogGroup, streamPrefix: 'admin' }),
    });

    const adminService = new ecs.FargateService(this, 'AdminService', {
      cluster,
      taskDefinition: adminTaskDef,
      desiredCount: 1,
      minHealthyPercent: 100,
      assignPublicIp: false,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
    });

    adminService.node.addDependency(adminDockerBuilder);
    adminService.attachToApplicationTargetGroup(adminTargetGroup);
    adminService.connections.allowFrom(apiLoadBalancer, ec2.Port.tcp(3000), 'Allow ALB to admin Next.js');

    // ============================================================
    // CloudFront Origins (same ALB, different headers for routing)
    // ============================================================
    const publicOrigin = new origins.LoadBalancerV2Origin(apiLoadBalancer, {
      protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
      customHeaders: { 'X-Origin-Service': 'public' },
    });

    const adminOrigin = new origins.LoadBalancerV2Origin(apiLoadBalancer, {
      protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
      customHeaders: { 'X-Origin-Service': 'admin' },
    });

    const apiOrigin = new origins.LoadBalancerV2Origin(apiLoadBalancer, {
      protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
    });

    // 5-minute cache for public pages
    const publicCachePolicy = new cloudfront.CachePolicy(this, 'PublicCachePolicy', {
      cachePolicyName: 'FlagshipPublic5Min',
      minTtl: cdk.Duration.seconds(300),
      defaultTtl: cdk.Duration.seconds(300),
      maxTtl: cdk.Duration.seconds(300),
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
    // CloudFront Distribution -- Public
    // ============================================================
    const publicDistribution = new cloudfront.Distribution(this, 'PublicDistribution', {
      defaultBehavior: {
        origin: publicOrigin,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: publicCachePolicy,
      },
      additionalBehaviors: {
        '/api/*': {
          origin: apiOrigin,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER,
        },
        '/_next/static/*': {
          origin: publicOrigin,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: staticCachePolicy,
        },
      },
    });

    // ============================================================
    // CloudFront Distribution -- Admin
    // ============================================================
    const adminDistribution = new cloudfront.Distribution(this, 'AdminDistribution', {
      defaultBehavior: {
        origin: adminOrigin,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER,
      },
      additionalBehaviors: {
        '/api/*': {
          origin: apiOrigin,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER,
        },
      },
    });

    // ============================================================
    // Outputs
    // ============================================================
    this.publicDistributionDomainName = publicDistribution.distributionDomainName;
    this.publicDistributionId = publicDistribution.distributionId;
    this.adminDistributionDomainName = adminDistribution.distributionDomainName;
    this.adminDistributionId = adminDistribution.distributionId;
    this.publicServiceArn = publicService.serviceArn;
    this.adminServiceArn = adminService.serviceArn;
    this.nextjsClusterName = cluster.clusterName;
    this.nextjsClusterArn = cluster.clusterArn;

    new cdk.CfnOutput(this, 'PublicDistributionDomainName', {
      value: publicDistribution.distributionDomainName,
      description: 'CloudFront domain for public site (flatironscap.com)',
    });
    new cdk.CfnOutput(this, 'PublicDistributionId', {
      value: publicDistribution.distributionId,
      description: 'CloudFront distribution ID for cache invalidation',
    });
    new cdk.CfnOutput(this, 'AdminDistributionDomainName', {
      value: adminDistribution.distributionDomainName,
      description: 'CloudFront domain for admin site (admin.flatironscap.com)',
    });
    new cdk.CfnOutput(this, 'AdminDistributionId', {
      value: adminDistribution.distributionId,
      description: 'CloudFront distribution ID for admin',
    });
    new cdk.CfnOutput(this, 'PublicServiceArn', {
      value: publicService.serviceArn,
      description: 'ECS service ARN for public Next.js',
    });
    new cdk.CfnOutput(this, 'AdminServiceArn', {
      value: adminService.serviceArn,
      description: 'ECS service ARN for admin Next.js',
    });
    new cdk.CfnOutput(this, 'NextjsClusterName', {
      value: cluster.clusterName,
      description: 'ECS cluster name for Next.js services',
    });
    new cdk.CfnOutput(this, 'NextjsClusterArn', {
      value: cluster.clusterArn,
      description: 'ECS cluster ARN',
    });
  }
}
