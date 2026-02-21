import * as cdk from 'aws-cdk-lib';
import { DefaultStackSynthesizer } from 'aws-cdk-lib';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export class EcrCacheStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ============================================================
    // ECR Pull-Through Cache for GitHub Container Registry
    // ============================================================
    // 
    // PREREQUISITE: Create the secret manually with the REQUIRED prefix:
    //
    // aws secretsmanager create-secret \
    //   --name ecr-pullthroughcache/ghcr \
    //   --secret-string '{"username":"YOUR_GITHUB_USERNAME","accessToken":"ghp_YOUR_PAT"}'
    //
    // The secret MUST have the "ecr-pullthroughcache/" prefix per AWS requirements.
    //
    // Images from ghcr.io will be cached at:
    // {account}.dkr.ecr.{region}.amazonaws.com/ghcr/...
    //
    // Example: ghcr.io/puppeteer/puppeteer:24.0.0 becomes
    // {account}.dkr.ecr.{region}.amazonaws.com/ghcr/puppeteer/puppeteer:24.0.0

    const ghcrSecret = secretsmanager.Secret.fromSecretNameV2(
      this, 'GhcrSecret',
      'ecr-pullthroughcache/ghcr'
    );

    new ecr.CfnPullThroughCacheRule(this, 'GhcrCache', {
      ecrRepositoryPrefix: 'ghcr',
      upstreamRegistry: 'github-container-registry',
      upstreamRegistryUrl: 'ghcr.io',
      credentialArn: ghcrSecret.secretArn,
    });

    // ============================================================
    // ECR Pull-Through Cache for Docker Hub
    // ============================================================
    // 
    // PREREQUISITE: Create the secret manually with the REQUIRED prefix:
    //
    // aws secretsmanager create-secret \
    //   --name ecr-pullthroughcache/docker-hub \
    //   --secret-string '{"username":"YOUR_DOCKERHUB_USERNAME","accessToken":"YOUR_DOCKERHUB_PAT"}'
    //
    // The secret MUST have the "ecr-pullthroughcache/" prefix per AWS requirements.
    //
    // Images from docker.io will be cached at:
    // {account}.dkr.ecr.{region}.amazonaws.com/docker-hub/...
    //
    // Example: node:24-alpine becomes
    // {account}.dkr.ecr.{region}.amazonaws.com/docker-hub/library/node:24-alpine
    //
    // Note: Official images use "library/" prefix (e.g., library/node, library/python)

    const dockerHubSecret = secretsmanager.Secret.fromSecretNameV2(
      this, 'DockerHubSecret',
      'ecr-pullthroughcache/docker-hub'
    );

    new ecr.CfnPullThroughCacheRule(this, 'DockerHubCache', {
      ecrRepositoryPrefix: 'docker-hub',
      upstreamRegistry: 'docker-hub',
      upstreamRegistryUrl: 'registry-1.docker.io',
      credentialArn: dockerHubSecret.secretArn,
    });

    // ============================================================
    // Registry Policy for Pull-Through Cache Access
    // ============================================================
    // Grants any IAM principal in this account permission to trigger
    // pull-through cache imports. Callers still need standard ECR pull
    // permissions (BatchGetImage, etc.) on their own IAM role — this
    // policy only authorizes the registry-level import/create actions.
    
    new ecr.CfnRegistryPolicy(this, 'PullThroughCacheRegistryPolicy', {
      policyText: {
        Version: '2012-10-17',
        Statement: [
          {
            Sid: 'AllowPullThroughCacheGhcr',
            Effect: 'Allow',
            Principal: {
              AWS: `arn:aws:iam::${this.account}:root`,
            },
            Action: [
              'ecr:BatchImportUpstreamImage',
              'ecr:CreateRepository',
            ],
            Resource: `arn:aws:ecr:${this.region}:${this.account}:repository/ghcr/*`,
          },
          {
            Sid: 'AllowPullThroughCacheDockerHub',
            Effect: 'Allow',
            Principal: {
              AWS: `arn:aws:iam::${this.account}:root`,
            },
            Action: [
              'ecr:BatchImportUpstreamImage',
              'ecr:CreateRepository',
            ],
            Resource: `arn:aws:ecr:${this.region}:${this.account}:repository/docker-hub/*`,
          },
        ],
      },
    });

    // ============================================================
    // IAM Policy for Bootstrap Role
    // ============================================================
    // The CDK bootstrap image-publishing role needs IAM permissions to pull
    // from cached repos. assetPublishingCodeBuildDefaults only adds to the
    // CodeBuild service role, but Docker uses the assumed bootstrap role.
    const qualifier = DefaultStackSynthesizer.DEFAULT_QUALIFIER;
    const imagePublishingRoleName = `cdk-${qualifier}-image-publishing-role-${this.account}-${this.region}`;

    new iam.CfnPolicy(this, 'EcrPullThroughCachePolicy', {
      policyName: 'EcrPullThroughCacheAccess',
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Sid: 'AllowPullFromGhcrCache',
            Effect: 'Allow',
            Action: [
              'ecr:BatchGetImage',
              'ecr:GetDownloadUrlForLayer',
              'ecr:BatchCheckLayerAvailability',
            ],
            Resource: `arn:aws:ecr:${this.region}:${this.account}:repository/ghcr/*`,
          },
          {
            Sid: 'AllowPullFromDockerHubCache',
            Effect: 'Allow',
            Action: [
              'ecr:BatchGetImage',
              'ecr:GetDownloadUrlForLayer',
              'ecr:BatchCheckLayerAvailability',
            ],
            Resource: `arn:aws:ecr:${this.region}:${this.account}:repository/docker-hub/*`,
          },
        ],
      },
      roles: [imagePublishingRoleName],
    });

    // ============================================================
    // Outputs
    // ============================================================
    new cdk.CfnOutput(this, 'EcrRegistry', {
      value: `${this.account}.dkr.ecr.${this.region}.amazonaws.com`,
      description: 'ECR registry URL for pull-through cache',
    });

    new cdk.CfnOutput(this, 'GhcrPrefix', {
      value: `${this.account}.dkr.ecr.${this.region}.amazonaws.com/ghcr`,
      description: 'ECR prefix for GitHub Container Registry images',
    });

    new cdk.CfnOutput(this, 'DockerHubPrefix', {
      value: `${this.account}.dkr.ecr.${this.region}.amazonaws.com/docker-hub`,
      description: 'ECR prefix for Docker Hub images',
    });
  }
}
