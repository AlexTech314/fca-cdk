import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { FckNatInstanceProvider } from 'cdk-fck-nat';
import { Construct } from 'constructs';

/**
 * Shared VPC stack deployed once, used by all stages.
 *
 * Uses fck-nat (t4g.nano ~$3/mo each, 2 instances for AZ resilience) instead of managed NAT Gateway (~$32/mo per AZ).
 * https://fck-nat.dev/stable/deploying/
 *
 * S3 Gateway VPC endpoint (free) reduces NAT traffic.
 * No SQS Interface endpoint -- $14.60/mo not worth it at low volume; routes through fck-nat instead.
 */
export class NetworkStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ============================================================
    // fck-nat NAT Instance Provider
    // ============================================================
    const natGatewayProvider = new FckNatInstanceProvider({
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.NANO),
    });

    // ============================================================
    // VPC: 2 AZs, public + private subnets
    // ============================================================
    this.vpc = new ec2.Vpc(this, 'Vpc', {
      maxAzs: 2,
      natGatewayProvider,
      natGateways: 2, // One per AZ for resilience
      subnetConfiguration: [
        {
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
        },
        {
          name: 'Isolated',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24,
        },
      ],
    });

    // Allow all VPC traffic through fck-nat
    natGatewayProvider.securityGroup.addIngressRule(
      ec2.Peer.ipv4(this.vpc.vpcCidrBlock),
      ec2.Port.allTraffic()
    );

    // ============================================================
    // VPC Endpoints
    // ============================================================

    // S3 Gateway Endpoint (free, no NAT traffic for S3)
    this.vpc.addGatewayEndpoint('S3Endpoint', {
      service: ec2.GatewayVpcEndpointAwsService.S3,
    });

    // Lambda Interface Endpoint (for RDS aws_lambda extension in isolated subnets)
    // See: https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc-endpoints.html
    // Service: com.amazonaws.<region>.lambda — enables Invoke API from private subnets without NAT
    this.vpc.addInterfaceEndpoint('LambdaEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.LAMBDA,
      subnets: { subnets: this.vpc.isolatedSubnets },
      privateDnsEnabled: true,
    });

    // STS Interface Endpoint (RDS needs STS to obtain IAM role credentials for aws_lambda extension)
    this.vpc.addInterfaceEndpoint('StsEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.STS,
      subnets: { subnets: this.vpc.isolatedSubnets },
      privateDnsEnabled: true,
    });

    // ============================================================
    // Outputs
    // ============================================================
    new cdk.CfnOutput(this, 'VpcId', {
      value: this.vpc.vpcId,
      description: 'Shared VPC ID',
      exportName: `${this.stackName}-VpcId`,
    });

    new cdk.CfnOutput(this, 'PrivateSubnetIds', {
      value: this.vpc.privateSubnets.map(s => s.subnetId).join(','),
      description: 'Private subnet IDs',
    });

    new cdk.CfnOutput(this, 'IsolatedSubnetIds', {
      value: this.vpc.isolatedSubnets.map(s => s.subnetId).join(','),
      description: 'Isolated subnet IDs (for RDS)',
    });
  }
}
