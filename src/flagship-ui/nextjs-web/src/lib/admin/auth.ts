/**
 * Auth library — wraps amazon-cognito-identity-js for Cognito authentication.
 * Supports custom endpoint for cognito-local in development.
 */

import {
  CognitoUser,
  AuthenticationDetails,
  CognitoUserSession,
} from 'amazon-cognito-identity-js';
import { getUserPool } from './amplify-config';

// ============================================
// Types
// ============================================

export type SignInStep =
  | 'DONE'
  | 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED'
  | 'RESET_PASSWORD';

export interface SignInResult {
  isSignedIn: boolean;
  nextStep?: SignInStep;
}

export interface AuthUser {
  id: string;
  email: string;
}

export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
}

// ============================================
// Internal: get current cognito user
// ============================================

function getCognitoUser(email: string): CognitoUser | null {
  const pool = getUserPool();
  if (!pool) return null;
  return new CognitoUser({ Username: email, Pool: pool });
}

// Keep a reference to the user during auth challenges (new password flow)
let pendingCognitoUser: CognitoUser | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pendingUserAttributes: any = null;

// ============================================
// Auth Functions
// ============================================

/**
 * Check if there's a valid session.
 */
export async function checkAuthSession(): Promise<AuthState> {
  const pool = getUserPool();
  if (!pool) return { user: null, isAuthenticated: false };

  const cognitoUser = pool.getCurrentUser();
  if (!cognitoUser) return { user: null, isAuthenticated: false };

  return new Promise((resolve) => {
    cognitoUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err || !session || !session.isValid()) {
        resolve({ user: null, isAuthenticated: false });
        return;
      }

      const idToken = session.getIdToken();
      resolve({
        user: {
          id: idToken.payload.sub || '',
          email: (idToken.payload.email as string) || cognitoUser.getUsername(),
        },
        isAuthenticated: true,
      });
    });
  });
}

/**
 * Sign in with email and password.
 */
export async function login(email: string, password: string): Promise<SignInResult> {
  const cognitoUser = getCognitoUser(email);
  if (!cognitoUser) throw new Error('Cognito not configured');

  const authDetails = new AuthenticationDetails({
    Username: email,
    Password: password,
  });

  // SRP for production (password never leaves browser), USER_PASSWORD_AUTH for cognito-local (no SRP support)
  const isLocal = !!process.env.NEXT_PUBLIC_COGNITO_ENDPOINT;
  if (isLocal) {
    cognitoUser.setAuthenticationFlowType('USER_PASSWORD_AUTH');
  }

  return new Promise((resolve, reject) => {
    cognitoUser.authenticateUser(authDetails, {
      onSuccess: () => {
        pendingCognitoUser = null;
        pendingUserAttributes = null;
        resolve({ isSignedIn: true });
      },
      onFailure: (err) => {
        reject(new Error(err.message || 'Login failed'));
      },
      newPasswordRequired: (userAttributes) => {
        // Store for confirmSignInWithNewPassword
        pendingCognitoUser = cognitoUser;
        pendingUserAttributes = userAttributes;
        // Remove non-writable attributes
        delete pendingUserAttributes.email_verified;
        delete pendingUserAttributes.email;
        resolve({ isSignedIn: false, nextStep: 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED' });
      },
    });
  });
}

/**
 * Confirm sign-in with a new password (first-time login with temp password).
 */
export async function confirmSignInWithNewPassword(newPassword: string): Promise<SignInResult> {
  if (!pendingCognitoUser) throw new Error('No pending password challenge');

  return new Promise((resolve, reject) => {
    pendingCognitoUser!.completeNewPasswordChallenge(newPassword, pendingUserAttributes, {
      onSuccess: () => {
        pendingCognitoUser = null;
        pendingUserAttributes = null;
        resolve({ isSignedIn: true });
      },
      onFailure: (err) => {
        reject(new Error(err.message || 'Failed to set new password'));
      },
    });
  });
}

/**
 * Initiate password reset flow.
 */
export async function initiatePasswordReset(email: string): Promise<{ destination?: string }> {
  const cognitoUser = getCognitoUser(email);
  if (!cognitoUser) throw new Error('Cognito not configured');

  return new Promise((resolve, reject) => {
    cognitoUser.forgotPassword({
      onSuccess: (data) => {
        resolve({ destination: data?.CodeDeliveryDetails?.Destination });
      },
      onFailure: (err) => {
        reject(new Error(err.message || 'Failed to initiate password reset'));
      },
    });
  });
}

/**
 * Confirm password reset with verification code.
 */
export async function confirmPasswordReset(
  email: string,
  code: string,
  newPassword: string
): Promise<void> {
  const cognitoUser = getCognitoUser(email);
  if (!cognitoUser) throw new Error('Cognito not configured');

  return new Promise((resolve, reject) => {
    cognitoUser.confirmPassword(code, newPassword, {
      onSuccess: () => resolve(),
      onFailure: (err) => reject(new Error(err.message || 'Failed to reset password')),
    });
  });
}

/**
 * Sign out the current user.
 */
export async function logout(): Promise<void> {
  const pool = getUserPool();
  if (!pool) return;
  const cognitoUser = pool.getCurrentUser();
  if (cognitoUser) {
    cognitoUser.signOut();
  }
}

/**
 * Get the current access token for API calls.
 */
export async function getAccessToken(): Promise<string | null> {
  const pool = getUserPool();
  if (!pool) return null;

  const cognitoUser = pool.getCurrentUser();
  if (!cognitoUser) return null;

  return new Promise((resolve) => {
    cognitoUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err || !session || !session.isValid()) {
        resolve(null);
        return;
      }
      resolve(session.getAccessToken().getJwtToken());
    });
  });
}
