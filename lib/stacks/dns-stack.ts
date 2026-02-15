import * as cdk from 'aws-cdk-lib';
// import * as route53 from 'aws-cdk-lib/aws-route53';
// import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import { Construct } from 'constructs';

/**
 * Placeholder DNS Stack for flatironscap.com
 *
 * NOT deployed yet. When ready to configure DNS:
 * 1. Register flatironscap.com or transfer nameservers
 * 2. Uncomment the hosted zone and certificate resources below
 * 3. Wire into FcaStage
 *
 * Two ACM certificates are needed:
 * - us-east-2: for ALB, API Gateway, and regional services
 * - us-east-1: only if using CloudFront (CloudFront requires us-east-1 certs)
 */
export class DnsStack extends cdk.Stack {
  // public readonly hostedZone: route53.IHostedZone;
  // public readonly regionalCertificate: acm.ICertificate;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ============================================================
    // Route 53 Hosted Zone
    // ============================================================
    // this.hostedZone = new route53.HostedZone(this, 'HostedZone', {
    //   zoneName: 'flatironscap.com',
    // });

    // ============================================================
    // ACM Certificate (us-east-2 -- regional services)
    // ============================================================
    // this.regionalCertificate = new acm.Certificate(this, 'RegionalCertificate', {
    //   domainName: 'flatironscap.com',
    //   subjectAlternativeNames: ['*.flatironscap.com'],
    //   validation: acm.CertificateValidation.fromDns(this.hostedZone),
    // });

    // ============================================================
    // ACM Certificate (us-east-1 -- CloudFront, if needed)
    // ============================================================
    // Note: CloudFront certificates MUST be in us-east-1 regardless of stack region.
    // This would need to be a separate stack or cross-region reference.
    // Consider using a custom resource or deploying a separate stack in us-east-1.

    // ============================================================
    // Outputs
    // ============================================================
    // new cdk.CfnOutput(this, 'HostedZoneId', {
    //   value: this.hostedZone.hostedZoneId,
    //   description: 'Route 53 Hosted Zone ID for flatironscap.com',
    // });
    //
    // new cdk.CfnOutput(this, 'CertificateArn', {
    //   value: this.regionalCertificate.certificateArn,
    //   description: 'ACM Certificate ARN (us-east-2)',
    // });
  }
}
