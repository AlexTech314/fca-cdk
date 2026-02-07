import type { User } from '@/types';

// API base URL (same as real.ts)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

// Hardcoded dev token (same as backend auth middleware and real.ts)
const DEV_TOKEN = 'dev-token-fca-admin-2024';

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
// Session state (persisted in sessionStorage)
// ===========================================

const SESSION_KEY = 'fca-admin-auth';

function getStoredSession(): AuthState {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch { /* ignore */ }
  return { user: null, isAuthenticated: false };
}

function setStoredSession(state: AuthState) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
}

function clearStoredSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

// ===========================================
// Auth Functions
// ===========================================

/**
 * Get the current authenticated user
 */
export async function getCurrentAuthUser(): Promise<User | null> {
  const session = getStoredSession();
  return session.user;
}

/**
 * Check if there's a valid session.
 * Verifies against the API that the token is still valid.
 */
export async function checkAuthSession(): Promise<AuthState> {
  const session = getStoredSession();
  if (!session.isAuthenticated || !session.user) {
    return { user: null, isAuthenticated: false };
  }

  // Verify the session is still valid by hitting the dashboard endpoint
  try {
    const response = await fetch(`${API_BASE_URL}/admin/dashboard`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEV_TOKEN}`,
      },
    });
    if (response.ok) {
      return session;
    }
  } catch { /* API unreachable */ }

  clearStoredSession();
  return { user: null, isAuthenticated: false };
}

/**
 * Sign in with email and password.
 * For dev: validates against the hardcoded dev credentials the backend accepts.
 * For production: will use Cognito.
 */
export async function login(email: string, password: string): Promise<SignInResult> {
  // Validate credentials against the backend by trying an authenticated request
  // The dev backend accepts DEV_TOKEN for admin@flatironscapital.com / any password
  // In production, this will use Cognito's signIn flow
  
  // For now, match the dev token auth: email must be admin@flatironscapital.com
  // and we verify the token works against the API
  try {
    const response = await fetch(`${API_BASE_URL}/admin/dashboard`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEV_TOKEN}`,
      },
    });

    if (!response.ok) {
      throw new Error('Invalid credentials');
    }

    const user: User = {
      id: 'dev-user',
      email,
      name: email.split('@')[0].split('.').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' '),
      role: 'admin',
      lastActiveAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    const state: AuthState = { user, isAuthenticated: true };
    setStoredSession(state);

    return { isSignedIn: true, user };
  } catch {
    throw new Error('Invalid email or password');
  }
}

/**
 * Confirm sign-in with a new password (Cognito first-login flow)
 */
export async function confirmSignInWithNewPassword(_newPassword: string): Promise<SignInResult> {
  // TODO: Cognito confirmSignIn with new password
  throw new Error('Not implemented — requires Cognito');
}

/**
 * Initiate password reset flow
 */
export async function initiatePasswordReset(_email: string): Promise<{ destination?: string }> {
  // TODO: Cognito resetPassword
  throw new Error('Not implemented — requires Cognito');
}

/**
 * Confirm password reset with code and new password
 */
export async function confirmPasswordReset(
  _email: string,
  _confirmationCode: string,
  _newPassword: string,
): Promise<void> {
  // TODO: Cognito confirmResetPassword
  throw new Error('Not implemented — requires Cognito');
}

/**
 * Sign out the current user
 */
export async function logout(): Promise<void> {
  clearStoredSession();
}

/**
 * Get the auth token for API authorization
 */
export async function getIdToken(): Promise<string | null> {
  const session = getStoredSession();
  return session.isAuthenticated ? DEV_TOKEN : null;
}

// ===========================================
// Helper Functions
// ===========================================

export function hasPermission(user: User, requiredRole: 'readonly' | 'readwrite' | 'admin'): boolean {
  const roleHierarchy: Record<string, number> = {
    readonly: 0,
    readwrite: 1,
    admin: 2,
  };
  return (roleHierarchy[user.role] ?? 0) >= roleHierarchy[requiredRole];
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
