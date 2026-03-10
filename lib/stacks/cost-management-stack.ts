import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as glue from 'aws-cdk-lib/aws-glue';
import * as athena from 'aws-cdk-lib/aws-athena';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

/**
 * CostManagementStack — CUR 2.0 data export + Athena query infrastructure.
 *
 * Creates:
 * 1. S3 bucket for CUR 2.0 Parquet delivery
 * 2. S3 bucket for Athena query results (7-day lifecycle)
 * 3. CUR 2.0 Data Export (daily, resource-level, Parquet/GZIP)
 * 4. Glue database + manually defined table (no crawler needed)
 * 5. Athena WorkGroup with scan-limit cost control
 *
 * Estimated cost: ~$1-3/mo
 */
export class CostManagementStack extends cdk.Stack {
  public readonly curBucket: s3.IBucket;
  public readonly athenaResultsBucket: s3.IBucket;
  public readonly athenaWorkGroupName: string;
  public readonly glueDatabaseName: string;
  public readonly glueTableName: string;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ============================================
    // S3 Bucket — CUR data delivery
    // ============================================
    const curBucket = new s3.Bucket(this, 'CurDataBucket', {
      bucketName: `fca-cur-data-${this.account}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      lifecycleRules: [
        {
          id: 'ExpireOldReports',
          expiration: cdk.Duration.days(365),
        },
      ],
    });

    // Allow the Data Exports service to write to this bucket
    curBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        sid: 'AllowBCMDataExportsWrite',
        effect: iam.Effect.ALLOW,
        principals: [new iam.ServicePrincipal('bcm-data-exports.amazonaws.com')],
        actions: ['s3:PutObject', 's3:GetBucketPolicy'],
        resources: [curBucket.bucketArn, `${curBucket.bucketArn}/*`],
        conditions: {
          StringLike: {
            'aws:SourceArn': `arn:aws:cur:us-east-1:${this.account}:definition/*`,
            'aws:SourceAccount': this.account,
          },
        },
      })
    );

    this.curBucket = curBucket;

    // ============================================
    // S3 Bucket — Athena query results
    // ============================================
    const athenaResultsBucket = new s3.Bucket(this, 'AthenaResultsBucket', {
      bucketName: `fca-athena-results-${this.account}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      lifecycleRules: [
        {
          id: 'ExpireResults',
          expiration: cdk.Duration.days(7),
        },
      ],
    });

    this.athenaResultsBucket = athenaResultsBucket;

    // ============================================
    // CUR 2.0 Data Export
    // ============================================
    const exportName = 'fca-cur-export';
    new cdk.CfnResource(this, 'CurExport', {
      type: 'AWS::BCMDataExports::Export',
      properties: {
        Export: {
          Name: exportName,
          DataQuery: {
            QueryStatement: 'SELECT * FROM COST_AND_USAGE_REPORT',
            TableConfigurations: {
              COST_AND_USAGE_REPORT: {
                TIME_GRANULARITY: 'DAILY',
                INCLUDE_RESOURCES: 'TRUE',
                INCLUDE_SPLIT_COST_ALLOCATION_DATA: 'FALSE',
                INCLUDE_MANUAL_DISCOUNT_COMPATIBILITY: 'FALSE',
              },
            },
          },
          DestinationConfigurations: {
            S3Destination: {
              S3Bucket: curBucket.bucketName,
              S3Prefix: 'cur-data',
              S3Region: this.region,
              S3OutputConfigurations: {
                OutputType: 'CUSTOM',
                Format: 'PARQUET',
                Compression: 'PARQUET',
                Overwrite: 'OVERWRITE_REPORT',
              },
            },
          },
          RefreshCadence: {
            Frequency: 'SYNCHRONOUS',
          },
        },
      },
    });

    // ============================================
    // Glue Database
    // ============================================
    const databaseName = 'fca_cost_reports';
    new glue.CfnDatabase(this, 'CostDatabase', {
      catalogId: this.account,
      databaseInput: {
        name: databaseName,
        description: 'CUR 2.0 cost and usage data',
      },
    });

    this.glueDatabaseName = databaseName;

    // ============================================
    // Glue Table — manual schema (CUR 2.0 Parquet)
    // ============================================
    const tableName = 'cost_and_usage';
    new glue.CfnTable(this, 'CostTable', {
      catalogId: this.account,
      databaseName,
      tableInput: {
        name: tableName,
        tableType: 'EXTERNAL_TABLE',
        parameters: {
          'classification': 'parquet',
          'parquet.compression': 'SNAPPY',
        },
        storageDescriptor: {
          location: `s3://${curBucket.bucketName}/cur-data/${exportName}/data/`,
          inputFormat: 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat',
          outputFormat: 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat',
          serdeInfo: {
            serializationLibrary: 'org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe',
          },
          columns: [
            { name: 'bill_bill_type', type: 'string' },
            { name: 'bill_billing_entity', type: 'string' },
            { name: 'bill_billing_period_end_date', type: 'timestamp' },
            { name: 'bill_billing_period_start_date', type: 'timestamp' },
            { name: 'bill_invoice_id', type: 'string' },
            { name: 'bill_invoicing_entity', type: 'string' },
            { name: 'bill_payer_account_id', type: 'string' },
            { name: 'bill_payer_account_name', type: 'string' },
            { name: 'identity_line_item_id', type: 'string' },
            { name: 'identity_time_interval', type: 'string' },
            { name: 'line_item_availability_zone', type: 'string' },
            { name: 'line_item_blended_cost', type: 'double' },
            { name: 'line_item_blended_rate', type: 'string' },
            { name: 'line_item_currency_code', type: 'string' },
            { name: 'line_item_line_item_description', type: 'string' },
            { name: 'line_item_line_item_type', type: 'string' },
            { name: 'line_item_net_unblended_cost', type: 'double' },
            { name: 'line_item_net_unblended_rate', type: 'string' },
            { name: 'line_item_normalization_factor', type: 'double' },
            { name: 'line_item_normalized_usage_amount', type: 'double' },
            { name: 'line_item_operation', type: 'string' },
            { name: 'line_item_product_code', type: 'string' },
            { name: 'line_item_resource_id', type: 'string' },
            { name: 'line_item_tax_type', type: 'string' },
            { name: 'line_item_unblended_cost', type: 'double' },
            { name: 'line_item_unblended_rate', type: 'string' },
            { name: 'line_item_usage_account_id', type: 'string' },
            { name: 'line_item_usage_account_name', type: 'string' },
            { name: 'line_item_usage_amount', type: 'double' },
            { name: 'line_item_usage_end_date', type: 'timestamp' },
            { name: 'line_item_usage_start_date', type: 'timestamp' },
            { name: 'line_item_usage_type', type: 'string' },
            { name: 'pricing_currency', type: 'string' },
            { name: 'pricing_lease_contract_length', type: 'string' },
            { name: 'pricing_offering_class', type: 'string' },
            { name: 'pricing_public_on_demand_cost', type: 'double' },
            { name: 'pricing_public_on_demand_rate', type: 'string' },
            { name: 'pricing_purchase_option', type: 'string' },
            { name: 'pricing_rate_code', type: 'string' },
            { name: 'pricing_rate_id', type: 'string' },
            { name: 'pricing_term', type: 'string' },
            { name: 'pricing_unit', type: 'string' },
            { name: 'product', type: 'string' },
            { name: 'resource_tags', type: 'string' },
            { name: 'cost_category', type: 'string' },
            { name: 'discount', type: 'string' },
          ],
        },
      },
    });

    this.glueTableName = tableName;

    // ============================================
    // Athena WorkGroup
    // ============================================
    const workGroupName = 'fca-cost-workgroup';
    new athena.CfnWorkGroup(this, 'CostWorkGroup', {
      name: workGroupName,
      state: 'ENABLED',
      workGroupConfiguration: {
        enforceWorkGroupConfiguration: true,
        publishCloudWatchMetricsEnabled: false,
        bytesScannedCutoffPerQuery: 100_000_000, // 100 MB limit per query
        resultConfiguration: {
          outputLocation: `s3://${athenaResultsBucket.bucketName}/query-results/`,
        },
      },
    });

    this.athenaWorkGroupName = workGroupName;

    // ============================================
    // Outputs
    // ============================================
    new cdk.CfnOutput(this, 'CurBucketName', {
      value: curBucket.bucketName,
      description: 'S3 bucket for CUR 2.0 data',
    });

    new cdk.CfnOutput(this, 'AthenaWorkGroup', {
      value: workGroupName,
      description: 'Athena workgroup for cost queries',
    });

    new cdk.CfnOutput(this, 'GlueDatabase', {
      value: databaseName,
      description: 'Glue database for CUR data',
    });
  }
}
