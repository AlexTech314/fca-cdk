import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { PipelineStack } from '../lib/pipeline-stack';

describe('PipelineStack', () => {
  let app: cdk.App;
  let stack: PipelineStack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    stack = new PipelineStack(app, 'TestPipelineStack', {
      repositoryName: 'test-owner/test-repo',
      connectionArn: 'arn:aws:codestar-connections:us-east-1:123456789012:connection/test-connection',
      env: {
        account: '123456789012',
        region: 'us-east-1',
      },
    });
    template = Template.fromStack(stack);
  });

  test('Pipeline is created with correct name', () => {
    template.hasResourceProperties('AWS::CodePipeline::Pipeline', {
      Name: 'fca-pipeline',
    });
  });

  test('Pipeline has self-mutation stage', () => {
    // Self-mutation creates an UpdatePipeline stage
    template.hasResourceProperties('AWS::CodePipeline::Pipeline', {
      Stages: Match.arrayWith([
        Match.objectLike({
          Name: 'UpdatePipeline',
        }),
      ]),
    });
  });

  test('Pipeline has source stage', () => {
    template.hasResourceProperties('AWS::CodePipeline::Pipeline', {
      Stages: Match.arrayWith([
        Match.objectLike({
          Name: 'Source',
        }),
      ]),
    });
  });

  test('Pipeline has build stage', () => {
    template.hasResourceProperties('AWS::CodePipeline::Pipeline', {
      Stages: Match.arrayWith([
        Match.objectLike({
          Name: 'Build',
        }),
      ]),
    });
  });

  test('Pipeline has Dev stage', () => {
    template.hasResourceProperties('AWS::CodePipeline::Pipeline', {
      Stages: Match.arrayWith([
        Match.objectLike({
          Name: 'Dev',
        }),
      ]),
    });
  });

  test('Cross-account KMS key is created', () => {
    // Cross-account deployments require a KMS key for artifact encryption
    template.resourceCountIs('AWS::KMS::Key', 1);
  });
});
