import * as cdk from 'aws-cdk-lib';
import * as route53 from 'aws-cdk-lib/aws-route53';
import { Construct } from 'constructs';

export interface DnsStackProps extends cdk.StackProps {
  readonly domainName: string;
}

/**
 * DNS Stack
 *
 * Creates the Route 53 hosted zone. After deployment, update the domain
 * registrar's nameservers to the NS records output by this stack.
 *
 * ACM certificates will be added once the hosted zone is active and
 * nameservers are pointed.
 */
export class DnsStack extends cdk.Stack {
  public readonly hostedZone: route53.IHostedZone;

  constructor(scope: Construct, id: string, props: DnsStackProps) {
    super(scope, id, props);

    this.hostedZone = new route53.HostedZone(this, 'HostedZone', {
      zoneName: props.domainName,
    });

    new cdk.CfnOutput(this, 'HostedZoneId', {
      value: this.hostedZone.hostedZoneId,
      description: `Route 53 Hosted Zone ID for ${props.domainName}`,
    });

    new cdk.CfnOutput(this, 'NameServers', {
      value: cdk.Fn.join(', ', this.hostedZone.hostedZoneNameServers!),
      description: 'NS records to set at your domain registrar',
    });
  }
}
