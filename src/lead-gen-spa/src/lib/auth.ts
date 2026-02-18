import type { User } from '@/types';
import { mockCurrentUser, mockOrganization } from './mock-data';
import { USE_MOCK_AUTH, DEMO_CREDENTIALS } from './amplify-config';

// ===========================================
// Types
// ===========================================

export type SignInStep = 
  | 'DONE'
  | 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED'
  | 'RESET_PASSWORD';

export interface SignInResult {
  isSignedIn: boolean;
  user?: User;
  nextStep?: SignInStep;
  codeDeliveryDetails?: {
    destination?: string;
    deliveryMedium?: string;
  };
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

// ===========================================
// Mock Auth State (in-memory)
// ===========================================

let mockAuthState: AuthState = {
  user: null,
  isAuthenticated: false,
};

let mockRequiresNewPassword = false;

// ===========================================
// Cognito (lazy-loaded to avoid import when using mock)
// ===========================================

async function getAmplifyAuth() {
  const { signIn, signOut, getCurrentUser, fetchAuthSession, confirmSignIn, resetPassword, confirmResetPassword } = await import('aws-amplify/auth');
  return { signIn, signOut, getCurrentUser, fetchAuthSession, confirmSignIn, resetPassword, confirmResetPassword };
}

// ===========================================
// Auth Functions
// ===========================================

/**
 * Get the current authenticated user
 */
export async function getCurrentAuthUser(): Promise<User | null> {
  if (USE_MOCK_AUTH) {
    await new Promise(resolve => setTimeout(resolve, 100));
    return mockAuthState.user;
  }

  try {
    const { getCurrentUser, fetchAuthSession } = await getAmplifyAuth();
    const cognitoUser = await getCurrentUser();
    const session = await fetchAuthSession();
    const groups = (session.tokens?.accessToken?.payload?.['cognito:groups'] as string[]) || [];
    const role = groups.includes('admin') ? 'admin' : groups.includes('readwrite') ? 'readwrite' : 'readonly';

    return {
      id: cognitoUser.userId,
      email: cognitoUser.signInDetails?.loginId || cognitoUser.username,
      name: null,
      cognitoSub: cognitoUser.userId,
      role,
      invitedAt: '',
      lastActiveAt: null,
      createdAt: '',
      updatedAt: '',
    };
  } catch {
    return null;
  }
}

/**
 * Check if there's a valid session
 */
export async function checkAuthSession(): Promise<AuthState> {
  if (USE_MOCK_AUTH) {
    await new Promise(resolve => setTimeout(resolve, 100));
    return mockAuthState;
  }

  try {
    const user = await getCurrentAuthUser();
    return { user, isAuthenticated: !!user };
  } catch {
    return { user: null, isAuthenticated: false };
  }
}

/**
 * Sign in with email and password
 */
export async function login(email: string, password: string): Promise<SignInResult> {
  if (USE_MOCK_AUTH) {
    await new Promise(resolve => setTimeout(resolve, 500));

    if (email === DEMO_CREDENTIALS.email && password === DEMO_CREDENTIALS.password) {
      mockAuthState = { user: mockCurrentUser, isAuthenticated: true };
      return { isSignedIn: true, user: mockCurrentUser };
    }

    if (email === 'newuser@flatironscapital.com' && password === 'temppass123') {
      mockRequiresNewPassword = true;
      return { isSignedIn: false, nextStep: 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED' };
    }

    throw new Error('Invalid email or password');
  }

  const { signIn } = await getAmplifyAuth();
  const result = await signIn({ username: email, password });

  if (result.isSignedIn) {
    const user = await getCurrentAuthUser();
    return { isSignedIn: true, user: user || undefined };
  }

  if (result.nextStep?.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
    return { isSignedIn: false, nextStep: 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED' };
  }

  return { isSignedIn: false };
}

/**
 * Confirm sign-in with a new password (for first-time login with temp password)
 */
export async function confirmSignInWithNewPassword(newPassword: string): Promise<SignInResult> {
  if (USE_MOCK_AUTH) {
    await new Promise(resolve => setTimeout(resolve, 500));
    if (mockRequiresNewPassword) {
      mockRequiresNewPassword = false;
      mockAuthState = { user: mockCurrentUser, isAuthenticated: true };
      return { isSignedIn: true, user: mockCurrentUser };
    }
    throw new Error('No pending password change');
  }

  const { confirmSignIn } = await getAmplifyAuth();
  const result = await confirmSignIn({ challengeResponse: newPassword });

  if (result.isSignedIn) {
    const user = await getCurrentAuthUser();
    return { isSignedIn: true, user: user || undefined };
  }

  return { isSignedIn: false };
}

/**
 * Initiate password reset flow
 */
export async function initiatePasswordReset(email: string): Promise<{ destination?: string }> {
  if (USE_MOCK_AUTH) {
    await new Promise(resolve => setTimeout(resolve, 500));
    const maskedEmail = email.replace(/(.{2})(.*)(@.*)/, '$1***$3');
    return { destination: maskedEmail };
  }

  const { resetPassword } = await getAmplifyAuth();
  const result = await resetPassword({ username: email });
  return {
    destination: result.nextStep?.codeDeliveryDetails?.destination,
  };
}

/**
 * Confirm password reset with code and new password
 */
export async function confirmPasswordReset(
  email: string,
  confirmationCode: string,
  newPassword: string
): Promise<void> {
  if (USE_MOCK_AUTH) {
    await new Promise(resolve => setTimeout(resolve, 500));
    if (confirmationCode === '123456') {
      console.log(`Password reset for ${email} with new password`);
      return;
    }
    throw new Error('Invalid verification code');
  }

  const { confirmResetPassword } = await getAmplifyAuth();
  await confirmResetPassword({ username: email, confirmationCode, newPassword });
}

/**
 * Sign out the current user
 */
export async function logout(): Promise<void> {
  if (USE_MOCK_AUTH) {
    await new Promise(resolve => setTimeout(resolve, 200));
    mockAuthState = { user: null, isAuthenticated: false };
    return;
  }

  const { signOut } = await getAmplifyAuth();
  await signOut();
}

/**
 * Get the access token for API authorization.
 * The leadgen API expects the Cognito access token (tokenUse: 'access'), not the ID token.
 */
export async function getIdToken(): Promise<string | null> {
  if (USE_MOCK_AUTH) {
    return mockAuthState.isAuthenticated ? 'mock-id-token' : null;
  }

  try {
    const { fetchAuthSession } = await getAmplifyAuth();
    const session = await fetchAuthSession();
    return session.tokens?.accessToken?.toString() || null;
  } catch {
    return null;
  }
}

// ===========================================
// Helper Functions
// ===========================================

export function getOrganizationName(): string {
  return mockOrganization.name;
}

export function hasPermission(user: User, requiredRole: 'readonly' | 'readwrite' | 'admin'): boolean {
  const roleHierarchy = {
    readonly: 0,
    readwrite: 1,
    admin: 2,
  };

  return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
}

export function canWrite(user: User): boolean {
  return hasPermission(user, 'readwrite');
}

export function isAdmin(user: User): boolean {
  return user.role === 'admin';
}

export function getUserInitials(user: User): string {
  if (user.name) {
    return user.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }
  return user.email.substring(0, 2).toUpperCase();
}
