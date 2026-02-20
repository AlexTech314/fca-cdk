import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminAddUserToGroupCommand,
  CreateGroupCommand,
} from '@aws-sdk/client-cognito-identity-provider';

export interface SeedCognitoOptions {
  userPoolId: string;
  email: string;
  password: string;
  groups: string[];
  endpoint?: string; // e.g. 'http://localhost:9229' for local
  region?: string;
  /** If true, skip existing users (do not overwrite password or groups) */
  skipIfExists?: boolean;
}

export async function seedCognitoUser(opts: SeedCognitoOptions): Promise<void> {
  const client = new CognitoIdentityProviderClient({
    region: opts.region ?? 'us-east-2',
    ...(opts.endpoint ? { endpoint: opts.endpoint } : {}),
  });

  // Create groups (idempotent -- ignore GroupExistsException)
  for (const group of opts.groups) {
    try {
      await client.send(
        new CreateGroupCommand({
          UserPoolId: opts.userPoolId,
          GroupName: group,
        })
      );
    } catch (e: unknown) {
      if ((e as { name?: string }).name !== 'GroupExistsException') throw e;
    }
  }

  // Create user (idempotent)
  try {
    await client.send(
      new AdminCreateUserCommand({
        UserPoolId: opts.userPoolId,
        Username: opts.email,
        UserAttributes: [
          { Name: 'email', Value: opts.email },
          { Name: 'email_verified', Value: 'true' },
        ],
        TemporaryPassword: opts.password,
        MessageAction: 'SUPPRESS',
      })
    );
  } catch (e: unknown) {
    if ((e as { name?: string }).name === 'UsernameExistsException') {
      if (opts.skipIfExists) {
        console.log(`Cognito: skipping existing user ${opts.email}`);
        return;
      }
    } else {
      throw e;
    }
  }

  // Set permanent password (only for newly created users)
  await client.send(
    new AdminSetUserPasswordCommand({
      UserPoolId: opts.userPoolId,
      Username: opts.email,
      Password: opts.password,
      Permanent: true,
    })
  );

  // Add to groups
  for (const group of opts.groups) {
    try {
      await client.send(
        new AdminAddUserToGroupCommand({
          UserPoolId: opts.userPoolId,
          Username: opts.email,
          GroupName: group,
        })
      );
    } catch {
      // ignore if already in group
    }
  }

  console.log(`Cognito: seeded user ${opts.email} in groups [${opts.groups.join(', ')}]`);
}
