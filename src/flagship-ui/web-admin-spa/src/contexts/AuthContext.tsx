import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { 
  checkAuthSession, 
  login as authLogin,
  confirmSignInWithNewPassword as authConfirmNewPassword,
  initiatePasswordReset as authInitiateReset,
  confirmPasswordReset as authConfirmReset,
  logout as authLogout, 
  canWrite as authCanWrite, 
  isAdmin as authIsAdmin,
  type AuthState,
  type SignInResult,
} from '@/lib/auth';

// Auth flow states
export type AuthFlow = 
  | 'LOGIN'
  | 'NEW_PASSWORD_REQUIRED'
  | 'FORGOT_PASSWORD'
  | 'CONFIRM_RESET_CODE';

interface AuthContextValue extends AuthState {
  // Current auth flow state
  authFlow: AuthFlow;
  pendingEmail: string | null;
  resetCodeDestination: string | null;
  
  // Computed properties
  isLoading: boolean;
  isAdmin: boolean;
  canWrite: boolean;
  
  // Actions
  login: (email: string, password: string) => Promise<SignInResult>;
  confirmNewPassword: (newPassword: string) => Promise<SignInResult>;
  forgotPassword: (email: string) => Promise<void>;
  confirmResetPassword: (code: string, newPassword: string) => Promise<void>;
  startForgotPasswordFlow: () => void;
  cancelAuthFlow: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [authState, setAuthState] = useState<AuthState>({ user: null, isAuthenticated: false });
  const [isLoading, setIsLoading] = useState(true);
  const [authFlow, setAuthFlow] = useState<AuthFlow>('LOGIN');
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [resetCodeDestination, setResetCodeDestination] = useState<string | null>(null);

  // Check auth session on mount
  useEffect(() => {
    const initAuth = async () => {
      const state = await checkAuthSession();
      setAuthState(state);
      setIsLoading(false);
    };
    
    initAuth();
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<SignInResult> => {
    const result = await authLogin(email, password);
    
    if (result.isSignedIn && result.user) {
      setAuthState({ user: result.user, isAuthenticated: true });
      setAuthFlow('LOGIN');
      setPendingEmail(null);
    } else if (result.nextStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
      setAuthFlow('NEW_PASSWORD_REQUIRED');
      setPendingEmail(email);
    } else if (result.nextStep === 'RESET_PASSWORD') {
      setAuthFlow('FORGOT_PASSWORD');
      setPendingEmail(email);
    }
    
    return result;
  }, []);

  const confirmNewPassword = useCallback(async (newPassword: string): Promise<SignInResult> => {
    const result = await authConfirmNewPassword(newPassword);
    
    if (result.isSignedIn && result.user) {
      setAuthState({ user: result.user, isAuthenticated: true });
      setAuthFlow('LOGIN');
      setPendingEmail(null);
    }
    
    return result;
  }, []);

  const forgotPassword = useCallback(async (email: string) => {
    const result = await authInitiateReset(email);
    setPendingEmail(email);
    setResetCodeDestination(result.destination || null);
    setAuthFlow('CONFIRM_RESET_CODE');
  }, []);

  const confirmResetPassword = useCallback(async (code: string, newPassword: string) => {
    if (!pendingEmail) {
      throw new Error('No email set for password reset');
    }
    await authConfirmReset(pendingEmail, code, newPassword);
    // After successful reset, go back to login
    setAuthFlow('LOGIN');
    setPendingEmail(null);
    setResetCodeDestination(null);
  }, [pendingEmail]);

  const cancelAuthFlow = useCallback(() => {
    setAuthFlow('LOGIN');
    setPendingEmail(null);
    setResetCodeDestination(null);
  }, []);

  const startForgotPasswordFlow = useCallback(() => {
    setAuthFlow('FORGOT_PASSWORD');
  }, []);

  const signOut = useCallback(async () => {
    await authLogout();
    setAuthState({ user: null, isAuthenticated: false });
    setAuthFlow('LOGIN');
    setPendingEmail(null);
  }, []);

  const value: AuthContextValue = {
    ...authState,
    authFlow,
    pendingEmail,
    resetCodeDestination,
    isLoading,
    isAdmin: authState.user ? authIsAdmin(authState.user) : false,
    canWrite: authState.user ? authCanWrite(authState.user) : false,
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
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
