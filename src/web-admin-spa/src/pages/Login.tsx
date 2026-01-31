import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, ArrowLeft, Info } from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { USE_MOCK_AUTH, DEMO_CREDENTIALS } from '@/lib/amplify-config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import logo from '@/assets/logo.png';

// Validation schemas
const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

const newPasswordSchema = z.object({
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email'),
});

const confirmResetSchema = z.object({
  code: z.string().min(6, 'Please enter the 6-digit code'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type LoginFormData = z.infer<typeof loginSchema>;
type NewPasswordFormData = z.infer<typeof newPasswordSchema>;
type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
type ConfirmResetFormData = z.infer<typeof confirmResetSchema>;

export default function Login() {
  const navigate = useNavigate();
  const {
    authFlow,
    login,
    confirmNewPassword,
    forgotPassword,
    confirmResetPassword,
    startForgotPasswordFlow,
    cancelAuthFlow,
    resetCodeDestination,
  } = useAuth();

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Login form
  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  // New password form
  const newPasswordForm = useForm<NewPasswordFormData>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  // Forgot password form
  const forgotPasswordForm = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  // Confirm reset form
  const confirmResetForm = useForm<ConfirmResetFormData>({
    resolver: zodResolver(confirmResetSchema),
    defaultValues: { code: '', newPassword: '', confirmPassword: '' },
  });

  const handleLogin = async (data: LoginFormData) => {
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await login(data.email, data.password);
      if (result.isSignedIn) {
        navigate('/');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNewPassword = async (data: NewPasswordFormData) => {
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await confirmNewPassword(data.newPassword);
      if (result.isSignedIn) {
        navigate('/');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set password');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (data: ForgotPasswordFormData) => {
    setError(null);
    setIsSubmitting(true);
    try {
      await forgotPassword(data.email);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset code');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmReset = async (data: ConfirmResetFormData) => {
    setError(null);
    setIsSubmitting(true);
    try {
      await confirmResetPassword(data.code, data.newPassword);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    setError(null);
    cancelAuthFlow();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="flex justify-center">
          <img
            src={logo}
            alt="Flatirons Capital"
            className="h-12 w-auto brightness-0 invert"
          />
        </div>

        {/* Demo credentials banner */}
        {USE_MOCK_AUTH && authFlow === 'LOGIN' && (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/10 border border-primary/20">
            <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-primary">Demo Mode</p>
              <p className="text-muted-foreground mt-1">
                Email: <code className="text-foreground">{DEMO_CREDENTIALS.email}</code>
              </p>
              <p className="text-muted-foreground">
                Password: <code className="text-foreground">{DEMO_CREDENTIALS.password}</code>
              </p>
            </div>
          </div>
        )}

        {/* Login Form */}
        {authFlow === 'LOGIN' && (
          <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl">Sign in</CardTitle>
              <CardDescription>
                Enter your credentials to access the admin dashboard
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@company.com"
                    {...loginForm.register('email')}
                  />
                  {loginForm.formState.errors.email && (
                    <p className="text-sm text-destructive">
                      {loginForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    {...loginForm.register('password')}
                  />
                  {loginForm.formState.errors.password && (
                    <p className="text-sm text-destructive">
                      {loginForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign in
                </Button>

                <Button
                  type="button"
                  variant="link"
                  className="w-full"
                  onClick={startForgotPasswordFlow}
                >
                  Forgot password?
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* New Password Required Form */}
        {authFlow === 'NEW_PASSWORD_REQUIRED' && (
          <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl">Set new password</CardTitle>
              <CardDescription>
                Please set a new password to continue
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={newPasswordForm.handleSubmit(handleNewPassword)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    {...newPasswordForm.register('newPassword')}
                  />
                  {newPasswordForm.formState.errors.newPassword && (
                    <p className="text-sm text-destructive">
                      {newPasswordForm.formState.errors.newPassword.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    {...newPasswordForm.register('confirmPassword')}
                  />
                  {newPasswordForm.formState.errors.confirmPassword && (
                    <p className="text-sm text-destructive">
                      {newPasswordForm.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Set Password
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={handleBack}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to login
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Forgot Password Form */}
        {authFlow === 'FORGOT_PASSWORD' && (
          <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl">Reset password</CardTitle>
              <CardDescription>
                Enter your email and we'll send you a reset code
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={forgotPasswordForm.handleSubmit(handleForgotPassword)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="resetEmail">Email</Label>
                  <Input
                    id="resetEmail"
                    type="email"
                    placeholder="name@company.com"
                    {...forgotPasswordForm.register('email')}
                  />
                  {forgotPasswordForm.formState.errors.email && (
                    <p className="text-sm text-destructive">
                      {forgotPasswordForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send Reset Code
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={handleBack}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to login
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Confirm Reset Code Form */}
        {authFlow === 'CONFIRM_RESET_CODE' && (
          <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl">Enter reset code</CardTitle>
              <CardDescription>
                {resetCodeDestination
                  ? `We sent a code to ${resetCodeDestination}`
                  : 'Enter the code we sent to your email'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={confirmResetForm.handleSubmit(handleConfirmReset)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Verification Code</Label>
                  <Input
                    id="code"
                    placeholder="123456"
                    {...confirmResetForm.register('code')}
                  />
                  {confirmResetForm.formState.errors.code && (
                    <p className="text-sm text-destructive">
                      {confirmResetForm.formState.errors.code.message}
                    </p>
                  )}
                  {USE_MOCK_AUTH && (
                    <p className="text-xs text-muted-foreground">
                      Demo mode: Use code <code>123456</code>
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="resetNewPassword">New Password</Label>
                  <Input
                    id="resetNewPassword"
                    type="password"
                    {...confirmResetForm.register('newPassword')}
                  />
                  {confirmResetForm.formState.errors.newPassword && (
                    <p className="text-sm text-destructive">
                      {confirmResetForm.formState.errors.newPassword.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="resetConfirmPassword">Confirm Password</Label>
                  <Input
                    id="resetConfirmPassword"
                    type="password"
                    {...confirmResetForm.register('confirmPassword')}
                  />
                  {confirmResetForm.formState.errors.confirmPassword && (
                    <p className="text-sm text-destructive">
                      {confirmResetForm.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Reset Password
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={handleBack}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to login
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
