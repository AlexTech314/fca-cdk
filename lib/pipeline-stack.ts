import * as cdk from 'aws-cdk-lib';
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
          // Install CDK project dependencies
          'npm ci',
          'npm run build',

          // Install pipeline task dependencies (Docker builds use these)
          'cd src/pipeline/places-task && npm ci && cd ../../..',
          'cd src/pipeline/scrape-task && npm ci && cd ../../..',
          'cd src/lambda/prepare-scrape && npm ci && cd ../../..',
          'cd src/lambda/aggregate-scrape && npm ci && cd ../../..',

          // Synthesize CDK
          'npx cdk synth',
        ],
        primaryOutputDirectory: 'cdk.out',
      }),

      // Enable Docker for building container images
      // Required if your stacks use DockerImageAsset, ECS, Lambda containers, etc.
      dockerEnabledForSynth: true,
      dockerEnabledForSelfMutation: true,
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
