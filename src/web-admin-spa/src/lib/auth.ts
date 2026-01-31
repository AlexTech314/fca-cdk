import type { User, SignInResult, SignInStep } from '@/types';
import { USE_MOCK_AUTH, DEMO_CREDENTIALS } from './amplify-config';
import { mockUser } from './mock-data';

// In-memory state for mock auth
let currentUser: User | null = null;
let pendingNewPasswordUser: User | null = null;

export async function login(email: string, password: string): Promise<SignInResult> {
  if (USE_MOCK_AUTH) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Check demo credentials
    if (email === DEMO_CREDENTIALS.email && password === DEMO_CREDENTIALS.password) {
      currentUser = mockUser;
      return {
        isSignedIn: true,
        user: mockUser,
      };
    }

    // Simulate new password required flow for specific email
    if (email === 'newuser@flatironscapital.com' && password === 'temppass123') {
      pendingNewPasswordUser = {
        ...mockUser,
        id: 'user-new',
        email: 'newuser@flatironscapital.com',
        name: 'New User',
      };
      return {
        isSignedIn: false,
        nextStep: 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED',
      };
    }

    throw new Error('Invalid email or password');
  }

  // Real Cognito implementation would go here
  // import { signIn } from 'aws-amplify/auth';
  // const result = await signIn({ username: email, password });
  throw new Error('Real auth not implemented');
}

export async function confirmNewPassword(newPassword: string): Promise<SignInResult> {
  if (USE_MOCK_AUTH) {
    await new Promise(resolve => setTimeout(resolve, 500));

    if (!pendingNewPasswordUser) {
      throw new Error('No pending password change');
    }

    if (newPassword.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    currentUser = pendingNewPasswordUser;
    pendingNewPasswordUser = null;

    return {
      isSignedIn: true,
      user: currentUser,
    };
  }

  throw new Error('Real auth not implemented');
}

export async function forgotPassword(email: string): Promise<{ destination?: string }> {
  if (USE_MOCK_AUTH) {
    await new Promise(resolve => setTimeout(resolve, 500));

    // Simulate sending reset code
    return {
      destination: email.replace(/(.{2}).*@/, '$1***@'),
    };
  }

  throw new Error('Real auth not implemented');
}

export async function confirmResetPassword(
  _email: string,
  code: string,
  newPassword: string
): Promise<void> {
  if (USE_MOCK_AUTH) {
    await new Promise(resolve => setTimeout(resolve, 500));

    if (code !== '123456') {
      throw new Error('Invalid verification code');
    }

    if (newPassword.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    // Password reset successful
    return;
  }

  throw new Error('Real auth not implemented');
}

export async function logout(): Promise<void> {
  if (USE_MOCK_AUTH) {
    await new Promise(resolve => setTimeout(resolve, 200));
    currentUser = null;
    return;
  }

  throw new Error('Real auth not implemented');
}

export async function checkAuthSession(): Promise<User | null> {
  if (USE_MOCK_AUTH) {
    await new Promise(resolve => setTimeout(resolve, 100));
    return currentUser;
  }

  throw new Error('Real auth not implemented');
}

export async function getIdToken(): Promise<string | null> {
  if (USE_MOCK_AUTH) {
    if (currentUser) {
      return 'mock-id-token-' + currentUser.id;
    }
    return null;
  }

  throw new Error('Real auth not implemented');
}

// Permission helpers
export function hasPermission(user: User | null, permission: 'read' | 'write' | 'admin'): boolean {
  if (!user) return false;
  
  switch (permission) {
    case 'read':
      return true; // All roles can read
    case 'write':
      return user.role === 'readwrite' || user.role === 'admin';
    case 'admin':
      return user.role === 'admin';
    default:
      return false;
  }
}

export function canWrite(user: User | null): boolean {
  return hasPermission(user, 'write');
}

export function isAdmin(user: User | null): boolean {
  return hasPermission(user, 'admin');
}

export function getUserInitials(user: User | null): string {
  if (!user || !user.name) return '??';
  
  const parts = user.name.split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return user.name.substring(0, 2).toUpperCase();
}

// Map Cognito next step to our SignInStep type
export function mapNextStep(cognitoStep: string): SignInStep {
  switch (cognitoStep) {
    case 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED':
      return 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED';
    case 'RESET_PASSWORD':
      return 'RESET_PASSWORD';
    default:
      return 'DONE';
  }
}
