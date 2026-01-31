import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertCircle, ArrowLeft, CheckCircle2, Info } from 'lucide-react';
import { USE_MOCK_AUTH, DEMO_CREDENTIALS } from '@/lib/amplify-config';
import logo from '@/assets/logo.png';

export default function Login() {
  const { 
    login, 
    confirmNewPassword,
    forgotPassword,
    confirmResetPassword,
    startForgotPasswordFlow,
    cancelAuthFlow,
    isAuthenticated, 
    isLoading: authLoading,
    authFlow,
    pendingEmail,
    resetCodeDestination,
  } = useAuth();
  
  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPasswordValue, setConfirmPasswordValue] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      // If not signed in, the authFlow state will change and show appropriate form
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (newPassword !== confirmPasswordValue) {
      setError('Passwords do not match');
      return;
    }
    
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    
    setIsLoading(true);

    try {
      await confirmNewPassword(newPassword);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set new password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await forgotPassword(email);
      // Success - authFlow will change to CONFIRM_RESET_CODE
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initiate password reset');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (newPassword !== confirmPasswordValue) {
      setError('Passwords do not match');
      return;
    }
    
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    
    setIsLoading(true);

    try {
      await confirmResetPassword(resetCode, newPassword);
      setSuccess('Password reset successful! Please sign in with your new password.');
      setNewPassword('');
      setConfirmPasswordValue('');
      setResetCode('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setError('');
    setSuccess('');
    cancelAuthFlow();
  };

  const fillDemoCredentials = () => {
    setEmail(DEMO_CREDENTIALS.email);
    setPassword(DEMO_CREDENTIALS.password);
  };

  const renderForm = () => {
    switch (authFlow) {
      case 'NEW_PASSWORD_REQUIRED':
        return (
          <form onSubmit={handleNewPassword} className="space-y-4">
            <div className="text-center mb-4">
              <h2 className="text-lg font-semibold text-foreground">Set New Password</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Please create a new password for your account
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPasswordValue}
                onChange={(e) => setConfirmPasswordValue(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting password...
                </>
              ) : (
                'Set Password'
              )}
            </Button>
          </form>
        );

      case 'FORGOT_PASSWORD':
        return (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="text-center mb-4">
              <h2 className="text-lg font-semibold text-foreground">Reset Password</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Enter your email to receive a reset code
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="resetEmail">Email</Label>
              <Input
                id="resetEmail"
                type="email"
                placeholder="you@flatironscapital.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending code...
                </>
              ) : (
                'Send Reset Code'
              )}
            </Button>

            <Button 
              type="button" 
              variant="ghost" 
              className="w-full" 
              onClick={handleBack}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Sign In
            </Button>
          </form>
        );

      case 'CONFIRM_RESET_CODE':
        return (
          <form onSubmit={handleConfirmReset} className="space-y-4">
            <div className="text-center mb-4">
              <h2 className="text-lg font-semibold text-foreground">Enter Reset Code</h2>
              <p className="text-sm text-muted-foreground mt-1">
                A code was sent to {resetCodeDestination || pendingEmail}
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            {USE_MOCK_AUTH && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 text-primary text-sm">
                <Info className="h-4 w-4 shrink-0" />
                Demo mode: Use code <code className="font-mono font-bold">123456</code>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="resetCode">Verification Code</Label>
              <Input
                id="resetCode"
                type="text"
                placeholder="123456"
                value={resetCode}
                onChange={(e) => setResetCode(e.target.value)}
                required
                autoComplete="one-time-code"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPasswordReset">New Password</Label>
              <Input
                id="newPasswordReset"
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPasswordReset">Confirm Password</Label>
              <Input
                id="confirmPasswordReset"
                type="password"
                placeholder="••••••••"
                value={confirmPasswordValue}
                onChange={(e) => setConfirmPasswordValue(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resetting password...
                </>
              ) : (
                'Reset Password'
              )}
            </Button>

            <Button 
              type="button" 
              variant="ghost" 
              className="w-full" 
              onClick={handleBack}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Sign In
            </Button>
          </form>
        );

      default: // LOGIN
        return (
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 text-success text-sm">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                {success}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@flatironscapital.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </Button>

            <Button 
              type="button" 
              variant="link" 
              className="w-full text-muted-foreground"
              onClick={() => {
                setError('');
                setSuccess('');
                startForgotPasswordFlow();
              }}
            >
              Forgot password?
            </Button>
          </form>
        );
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-card border p-3">
            <img src={logo} alt="Flatirons Capital" className="h-full w-full brightness-0 invert" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Flatirons Capital</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Web Admin Dashboard
          </p>
        </div>

        {/* Demo Credentials Banner */}
        {USE_MOCK_AUTH && authFlow === 'LOGIN' && (
          <Card className="mb-4 border-primary/30 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Demo Mode</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Use these credentials to sign in:
                  </p>
                  <div className="mt-2 p-2 rounded bg-background/50 font-mono text-xs">
                    <div>Email: <span className="text-primary">{DEMO_CREDENTIALS.email}</span></div>
                    <div>Password: <span className="text-primary">{DEMO_CREDENTIALS.password}</span></div>
                  </div>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    className="mt-2 h-7 text-xs"
                    onClick={fillDemoCredentials}
                  >
                    Fill Demo Credentials
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Auth form */}
        <Card>
          <CardContent className="p-6">
            {renderForm()}
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-muted-foreground">
          {USE_MOCK_AUTH && (
            <Badge variant="outline" className="text-[10px]">Mock Auth Enabled</Badge>
          )}
        </p>
      </div>
    </div>
  );
}
