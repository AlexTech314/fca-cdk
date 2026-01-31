import type { User } from '@/types';
import { mockUser } from './mock-data';
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
// Auth Functions
// ===========================================

/**
 * Get the current authenticated user
 */
export async function getCurrentAuthUser(): Promise<User | null> {
  await new Promise(resolve => setTimeout(resolve, 100));
  
  if (USE_MOCK_AUTH) {
    return mockAuthState.user;
  }
  
  // Real Cognito implementation would go here:
  // try {
  //   const user = await getCurrentUser();
  //   return { email: user.signInDetails?.loginId || user.username, ... };
  // } catch { return null; }
  
  return null;
}

/**
 * Check if there's a valid session
 */
export async function checkAuthSession(): Promise<AuthState> {
  await new Promise(resolve => setTimeout(resolve, 100));
  
  if (USE_MOCK_AUTH) {
    return mockAuthState;
  }
  
  // Real Cognito implementation would go here:
  // try {
  //   const session = await fetchAuthSession();
  //   if (session.tokens?.idToken) { ... }
  // } catch { ... }
  
  return { user: null, isAuthenticated: false };
}

/**
 * Sign in with email and password
 */
export async function login(email: string, password: string): Promise<SignInResult> {
  await new Promise(resolve => setTimeout(resolve, 500));
  
  if (USE_MOCK_AUTH) {
    // Check demo credentials
    if (email === DEMO_CREDENTIALS.email && password === DEMO_CREDENTIALS.password) {
      mockAuthState = {
        user: mockUser,
        isAuthenticated: true,
      };
      return { isSignedIn: true, user: mockUser };
    }
    
    // Simulate temp password flow (for testing)
    if (email === 'newuser@flatironscapital.com' && password === 'temppass123') {
      mockRequiresNewPassword = true;
      return { 
        isSignedIn: false, 
        nextStep: 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED' 
      };
    }
    
    throw new Error('Invalid email or password');
  }
  
  // Real Cognito implementation would go here:
  // const result = await amplifySignIn({ username: email, password });
  // ...
  
  throw new Error('Real auth not configured');
}

/**
 * Confirm sign-in with a new password (for first-time login with temp password)
 */
export async function confirmSignInWithNewPassword(_newPassword: string): Promise<SignInResult> {
  await new Promise(resolve => setTimeout(resolve, 500));
  
  if (USE_MOCK_AUTH) {
    if (mockRequiresNewPassword) {
      mockRequiresNewPassword = false;
      mockAuthState = {
        user: mockUser,
        isAuthenticated: true,
      };
      return { isSignedIn: true, user: mockUser };
    }
    throw new Error('No pending password change');
  }
  
  // Real Cognito implementation would go here:
  // const result = await amplifyConfirmSignIn({ challengeResponse: newPassword });
  // ...
  
  throw new Error('Real auth not configured');
}

/**
 * Initiate password reset flow
 */
export async function initiatePasswordReset(email: string): Promise<{ destination?: string }> {
  await new Promise(resolve => setTimeout(resolve, 500));
  
  if (USE_MOCK_AUTH) {
    // Simulate sending reset code
    const maskedEmail = email.replace(/(.{2})(.*)(@.*)/, '$1***$3');
    return { destination: maskedEmail };
  }
  
  // Real Cognito implementation would go here:
  // const result = await amplifyResetPassword({ username: email });
  // ...
  
  throw new Error('Real auth not configured');
}

/**
 * Confirm password reset with code and new password
 */
export async function confirmPasswordReset(
  email: string, 
  confirmationCode: string, 
  _newPassword: string
): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 500));
  
  if (USE_MOCK_AUTH) {
    // Simulate code validation
    if (confirmationCode === '123456') {
      // Update demo credentials for this session
      console.log(`Password reset for ${email} with new password`);
      return;
    }
    throw new Error('Invalid verification code');
  }
  
  // Real Cognito implementation would go here:
  // await amplifyConfirmResetPassword({ username: email, confirmationCode, newPassword });
  
  throw new Error('Real auth not configured');
}

/**
 * Sign out the current user
 */
export async function logout(): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 200));
  
  if (USE_MOCK_AUTH) {
    mockAuthState = { user: null, isAuthenticated: false };
    return;
  }
  
  // Real Cognito implementation would go here:
  // await amplifySignOut();
}

/**
 * Get the ID token for API authorization
 */
export async function getIdToken(): Promise<string | null> {
  if (USE_MOCK_AUTH) {
    return mockAuthState.isAuthenticated ? 'mock-id-token' : null;
  }
  
  // Real Cognito implementation would go here:
  // const session = await fetchAuthSession();
  // return session.tokens?.idToken?.toString() || null;
  
  return null;
}

// ===========================================
// Helper Functions
// ===========================================

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

export function getUserInitials(user: User | null): string {
  if (!user) return '??';
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
