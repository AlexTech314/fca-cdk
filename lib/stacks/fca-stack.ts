import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface FcaStackProps extends cdk.StackProps {
  // Add stack-specific configuration here
}

/**
 * Main FCA application stack.
 * 
 * Add your infrastructure resources here.
 */
export class FcaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: FcaStackProps) {
    super(scope, id, props);

    // Add your infrastructure here
    // Examples:
    
    // S3 Bucket
    // const bucket = new s3.Bucket(this, 'DataBucket', {
    //   removalPolicy: cdk.RemovalPolicy.DESTROY,
    //   autoDeleteObjects: true,
    // });

    // Lambda Function
    // const handler = new lambda.Function(this, 'Handler', {
    //   runtime: lambda.Runtime.NODEJS_20_X,
    //   code: lambda.Code.fromAsset('lambda'),
    //   handler: 'index.handler',
    // });

    // DynamoDB Table
    // const table = new dynamodb.Table(this, 'Table', {
    //   partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
    //   removalPolicy: cdk.RemovalPolicy.DESTROY,
    // });

    // Output example
    // new cdk.CfnOutput(this, 'BucketName', {
    //   value: bucket.bucketName,
    //   description: 'The name of the S3 bucket',
    // });
  }
}
