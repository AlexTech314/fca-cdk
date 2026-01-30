import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { FcaStack } from '../stacks/fca-stack';

export interface FcaStageProps extends cdk.StageProps {
  // Add stage-specific configuration here
}

/**
 * The FCA application stage.
 * 
 * Stages group related stacks that should be deployed together.
 * Add additional stacks here as your application grows.
 */
export class FcaStage extends cdk.Stage {
  public readonly fcaStack: FcaStack;

  constructor(scope: Construct, id: string, props?: FcaStageProps) {
    super(scope, id, props);

    // Create the main application stack
    this.fcaStack = new FcaStack(this, 'FcaStack', {
      // Stack-specific props can be passed here
    });

    // Add additional stacks as needed:
    // this.databaseStack = new DatabaseStack(this, 'DatabaseStack', { ... });
    // this.apiStack = new ApiStack(this, 'ApiStack', { ... });
  }
}
