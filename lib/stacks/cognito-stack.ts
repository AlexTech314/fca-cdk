import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';

/**
 * Cognito User Pool for lead-gen-spa authentication.
 *
 * - Email-based sign-in
 * - Admin-only user creation (no self sign-up)
 * - User groups: admin, readwrite, readonly (for API role mapping)
 * - Hosted UI for OAuth code flow
 */
export class CognitoStack extends cdk.Stack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly cognitoDomainPrefix: string;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.cognitoDomainPrefix = 'fca-leadgen-dev';

    // User Pool
    this.userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: 'fca-leadgen-users',
      signInAliases: { email: true },
      signInCaseSensitive: false,
      selfSignUpEnabled: false,
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      deletionProtection: true,
    });

    // App Client (public, for SPA)
    this.userPoolClient = this.userPool.addClient('LeadGenClient', {
      userPoolClientName: 'lead-gen-spa',
      generateSecret: false,
      authFlows: { userSrp: true },
      oAuth: {
        flows: { authorizationCodeGrant: true },
        scopes: [cognito.OAuthScope.OPENID, cognito.OAuthScope.EMAIL],
        callbackUrls: ['http://localhost:5173/'],
        logoutUrls: ['http://localhost:5173/'],
      },
      preventUserExistenceErrors: true,
    });

    // Cognito Domain (Hosted UI)
    this.userPool.addDomain('Domain', {
      cognitoDomain: { domainPrefix: this.cognitoDomainPrefix },
    });

    // User Groups for API role mapping
    new cognito.CfnUserPoolGroup(this, 'AdminGroup', {
      userPoolId: this.userPool.userPoolId,
      groupName: 'admin',
      description: 'Full access',
    });
    new cognito.CfnUserPoolGroup(this, 'ReadWriteGroup', {
      userPoolId: this.userPool.userPoolId,
      groupName: 'readwrite',
      description: 'Campaign management, lead qualification',
    });
    new cognito.CfnUserPoolGroup(this, 'ReadOnlyGroup', {
      userPoolId: this.userPool.userPoolId,
      groupName: 'readonly',
      description: 'Dashboard viewing',
    });

    // Outputs
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: this.userPool.userPoolId,
      description: 'Cognito User Pool ID',
    });
    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: this.userPoolClient.userPoolClientId,
      description: 'Cognito App Client ID',
    });
    new cdk.CfnOutput(this, 'CognitoDomainPrefix', {
      value: this.cognitoDomainPrefix,
      description: 'Cognito domain prefix (auth.{prefix}.auth.{region}.amazoncognito.com)',
    });
  }
}
