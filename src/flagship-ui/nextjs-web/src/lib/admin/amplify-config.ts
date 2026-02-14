/**
 * Cognito configuration.
 * Uses amazon-cognito-identity-js directly (not Amplify high-level APIs)
 * because it supports custom endpoints for cognito-local.
 */

import { CognitoUserPool } from 'amazon-cognito-identity-js';

let pool: CognitoUserPool | null = null;

export function getUserPool(): CognitoUserPool | null {
  if (pool) return pool;

  const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID;
  const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID;
  const endpoint = process.env.NEXT_PUBLIC_COGNITO_ENDPOINT; // http://localhost:9229 for dev

  if (!userPoolId || !clientId) {
    console.warn('[cognito] NEXT_PUBLIC_COGNITO_USER_POOL_ID or NEXT_PUBLIC_COGNITO_CLIENT_ID not set');
    return null;
  }

  pool = new CognitoUserPool({
    UserPoolId: userPoolId,
    ClientId: clientId,
    ...(endpoint ? { endpoint } : {}),
  });

  return pool;
}
