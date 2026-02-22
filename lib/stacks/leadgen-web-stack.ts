import * as cr from 'aws-cdk-lib/custom-resources';
import * as cdk from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';
import * as path from 'path';

export interface LeadGenWebStackProps extends cdk.StackProps {
  readonly apiLoadBalancer: elbv2.IApplicationLoadBalancer;
}

/**
 * Lead-gen SPA stack.
 *
 * CloudFront distribution: /api/* -> ApiStack ALB; default -> S3 (SPA).
 */
export class LeadGenWebStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: LeadGenWebStackProps) {
    super(scope, id, props);

    const { apiLoadBalancer } = props;

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
          origin: new origins.LoadBalancerV2Origin(apiLoadBalancer, {
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

    const deploySpa = new s3deploy.BucketDeployment(this, 'DeploySpa', {
      sources: [s3deploy.Source.asset(path.join(__dirname, '../../src/lead-gen-spa/dist'))],
      destinationBucket: spaBucket,
      distribution,
      distributionPaths: ['/*'],
      cacheControl: [
        s3deploy.CacheControl.setPublic(),
        s3deploy.CacheControl.maxAge(cdk.Duration.hours(1)),
      ],
    });

    const invalidationTrigger = `${deploySpa.deployedBucket.bucketName}-${deploySpa.node.addr}`;
    const invalidationParams = () => ({
      DistributionId: distribution.distributionId,
      InvalidationBatch: {
        CallerReference: `invalidate-leadgen-${invalidationTrigger}`,
        Paths: { Quantity: 1, Items: ['/*'] },
      },
    });
    const invalidateLeadGen = new cr.AwsCustomResource(this, 'InvalidateLeadGen', {
      onCreate: {
        service: 'CloudFront',
        action: 'createInvalidation',
        parameters: invalidationParams(),
        physicalResourceId: cr.PhysicalResourceId.of(`invalidate-leadgen-${invalidationTrigger}`),
      },
      onUpdate: {
        service: 'CloudFront',
        action: 'createInvalidation',
        parameters: invalidationParams(),
        physicalResourceId: cr.PhysicalResourceId.of(`invalidate-leadgen-${invalidationTrigger}`),
      },
      policy: cr.AwsCustomResourcePolicy.fromStatements([
        new iam.PolicyStatement({
          actions: ['cloudfront:CreateInvalidation'],
          resources: cr.AwsCustomResourcePolicy.ANY_RESOURCE,
        }),
      ]),
    });
    invalidateLeadGen.node.addDependency(deploySpa);

    new cdk.CfnOutput(this, 'DistributionDomainName', {
      value: distribution.distributionDomainName,
      description: 'CloudFront distribution domain',
    });
    new cdk.CfnOutput(this, 'DistributionId', {
      value: distribution.distributionId,
      description: 'CloudFront distribution ID',
    });
    new cdk.CfnOutput(this, 'SpaBucketName', {
      value: spaBucket.bucketName,
      description: 'S3 bucket for SPA assets',
    });
  }
}
