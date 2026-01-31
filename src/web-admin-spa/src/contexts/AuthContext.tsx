import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { User, AuthFlow, SignInResult } from '@/types';
import {
  login as authLogin,
  logout as authLogout,
  checkAuthSession,
  confirmNewPassword as authConfirmNewPassword,
  forgotPassword as authForgotPassword,
  confirmResetPassword as authConfirmResetPassword,
  canWrite as checkCanWrite,
  isAdmin as checkIsAdmin,
} from '@/lib/auth';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authFlow: AuthFlow;
  pendingEmail: string | null;
  resetCodeDestination: string | null;

  // Permission helpers
  canWrite: boolean;
  isAdmin: boolean;

  // Actions
  login: (email: string, password: string) => Promise<SignInResult>;
  confirmNewPassword: (newPassword: string) => Promise<SignInResult>;
  forgotPassword: (email: string) => Promise<void>;
  confirmResetPassword: (code: string, newPassword: string) => Promise<void>;
  startForgotPasswordFlow: () => void;
  cancelAuthFlow: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authFlow, setAuthFlow] = useState<AuthFlow>('LOGIN');
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [resetCodeDestination, setResetCodeDestination] = useState<string | null>(null);

  // Check session on mount
  useEffect(() => {
    checkAuthSession()
      .then(setUser)
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<SignInResult> => {
    setPendingEmail(email);
    const result = await authLogin(email, password);

    if (result.isSignedIn && result.user) {
      setUser(result.user);
      setAuthFlow('LOGIN');
      setPendingEmail(null);
    } else if (result.nextStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
      setAuthFlow('NEW_PASSWORD_REQUIRED');
    }

    return result;
  }, []);

  const confirmNewPassword = useCallback(async (newPassword: string): Promise<SignInResult> => {
    const result = await authConfirmNewPassword(newPassword);

    if (result.isSignedIn && result.user) {
      setUser(result.user);
      setAuthFlow('LOGIN');
      setPendingEmail(null);
    }

    return result;
  }, []);

  const forgotPassword = useCallback(async (email: string): Promise<void> => {
    setPendingEmail(email);
    const result = await authForgotPassword(email);
    setResetCodeDestination(result.destination || null);
    setAuthFlow('CONFIRM_RESET_CODE');
  }, []);

  const confirmResetPassword = useCallback(async (code: string, newPassword: string): Promise<void> => {
    if (!pendingEmail) {
      throw new Error('No pending email for password reset');
    }
    await authConfirmResetPassword(pendingEmail, code, newPassword);
    setAuthFlow('LOGIN');
    setPendingEmail(null);
    setResetCodeDestination(null);
  }, [pendingEmail]);

  const startForgotPasswordFlow = useCallback(() => {
    setAuthFlow('FORGOT_PASSWORD');
  }, []);

  const cancelAuthFlow = useCallback(() => {
    setAuthFlow('LOGIN');
    setPendingEmail(null);
    setResetCodeDestination(null);
  }, []);

  const signOut = useCallback(async () => {
    await authLogout();
    setUser(null);
    setAuthFlow('LOGIN');
    setPendingEmail(null);
    setResetCodeDestination(null);
  }, []);

  const value: AuthContextValue = {
    user,
    isAuthenticated: !!user,
    isLoading,
    authFlow,
    pendingEmail,
    resetCodeDestination,
    canWrite: checkCanWrite(user),
    isAdmin: checkIsAdmin(user),
    login,
    confirmNewPassword,
    forgotPassword,
    confirmResetPassword,
    startForgotPasswordFlow,
    cancelAuthFlow,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
