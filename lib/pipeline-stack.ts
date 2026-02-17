import * as cdk from 'aws-cdk-lib';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import { Construct } from 'constructs';
import * as pipelines from 'aws-cdk-lib/pipelines';
import { FcaStage } from './stages/fca-stage';

export interface PipelineStackProps extends cdk.StackProps {
  /**
   * The GitHub repository in the format 'owner/repo'
   */
  readonly repositoryName: string;

  /**
   * The branch to deploy from
   * @default 'main'
   */
  readonly branchName?: string;

  /**
   * The ARN of the CodeStar connection for GitHub
   */
  readonly connectionArn: string;
}

export class PipelineStack extends cdk.Stack {
  public readonly pipeline: pipelines.CodePipeline;

  constructor(scope: Construct, id: string, props: PipelineStackProps) {
    super(scope, id, props);

    const branchName = props.branchName ?? 'main';

    // Source from GitHub using CodeStar Connections
    const source = pipelines.CodePipelineSource.connection(
      props.repositoryName,
      branchName,
      {
        connectionArn: props.connectionArn,
        triggerOnPush: true,
      }
    );

    // Create the self-mutating pipeline
    this.pipeline = new pipelines.CodePipeline(this, 'Pipeline', {
      pipelineName: 'fca-pipeline',
      crossAccountKeys: true, // Enable cross-account deployments if needed
      selfMutation: true, // Pipeline will update itself

      synth: new pipelines.ShellStep('Synth', {
        input: source,
        commands: [
          'npm ci',
          'npm run build',
          // Build lead-gen-spa (Vite bakes VITE_* at build time)
          'cd src/lead-gen-spa && npm ci && npm run build && cd ../..',
          'npx cdk synth',
        ],
        primaryOutputDirectory: 'cdk.out',
        env: {
          VITE_API_BASE_URL: '',
          VITE_COGNITO_USER_POOL_ID: '',
          VITE_COGNITO_CLIENT_ID: '',
          VITE_USE_MOCK_AUTH: 'true',
        },
      }),

      dockerEnabledForSynth: true,
      dockerEnabledForSelfMutation: true,

      // Register QEMU in asset publishing so Docker can cross-build ARM64 images on x86_64
      // Pull from ECR cache to avoid Docker Hub rate limits (multiarch/qemu-user-static)
      assetPublishingCodeBuildDefaults: {
        buildEnvironment: { privileged: true },
        partialBuildSpec: codebuild.BuildSpec.fromObject({
          phases: {
            install: {
              commands: [
                'export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)',
                'export AWS_REGION=${AWS_REGION:-$AWS_DEFAULT_REGION}',
                'aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com',
                'docker pull $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/docker-hub/multiarch/qemu-user-static:latest',
                'docker run --rm --privileged $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/docker-hub/multiarch/qemu-user-static:latest --reset -p yes',
              ],
            },
          },
        }),
      },
    });

    // Add the application stage
    const devStage = new FcaStage(this, 'Dev', {
      env: props.env,
    });

    this.pipeline.addStage(devStage, {
      // Add pre/post deployment steps if needed
      // pre: [],
      // post: [],
    });
  }
}
