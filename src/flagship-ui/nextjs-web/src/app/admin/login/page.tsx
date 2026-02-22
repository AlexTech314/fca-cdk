'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/contexts/admin/AuthContext';

export default function AdminLoginPage() {
  const router = useRouter();
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

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPasswordValue, setConfirmPasswordValue] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.push('/admin');
    }
  }, [authLoading, isAuthenticated, router]);

  // Full-screen spinner while checking session or redirecting
  if (authLoading || isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <svg
          className="h-8 w-8 animate-spin text-primary"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    );
  }

  // ---- Handlers ----

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(email, password);
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

  // ---- Shared UI pieces ----

  const ErrorBanner = () =>
    error ? (
      <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
        <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
        </svg>
        {error}
      </div>
    ) : null;

  const SuccessBanner = () =>
    success ? (
      <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-700">
        <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
        {success}
      </div>
    ) : null;

  const SubmitButton = ({ text, loadingText }: { text: string; loadingText: string }) => (
    <button
      type="submit"
      disabled={isLoading}
      className="flex w-full items-center justify-center rounded-md px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110 disabled:opacity-60"
      style={{ background: 'linear-gradient(to right, #1e3a5f, #2d4a6f)' }}
    >
      {isLoading ? (
        <>
          <svg className="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          {loadingText}
        </>
      ) : (
        text
      )}
    </button>
  );

  const BackButton = () => (
    <button
      type="button"
      onClick={handleBack}
      className="flex w-full items-center justify-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium text-gray-500 transition-colors hover:text-gray-700"
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
      </svg>
      Back to Sign In
    </button>
  );

  const inputClass =
    'w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary';

  // ---- Forms ----

  const renderForm = () => {
    switch (authFlow) {
      case 'NEW_PASSWORD_REQUIRED':
        return (
          <form onSubmit={handleNewPassword} className="space-y-4">
            <div className="mb-4 text-center">
              <h2 className="text-lg font-semibold text-gray-900">Set New Password</h2>
              <p className="mt-1 text-sm text-gray-500">Please create a new password for your account</p>
            </div>
            <ErrorBanner />
            <div className="space-y-1.5">
              <label htmlFor="newPassword" className="text-sm font-medium text-gray-700">New Password</label>
              <input id="newPassword" type="password" placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} autoComplete="new-password" className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">Confirm Password</label>
              <input id="confirmPassword" type="password" placeholder="••••••••" value={confirmPasswordValue} onChange={(e) => setConfirmPasswordValue(e.target.value)} required minLength={8} autoComplete="new-password" className={inputClass} />
            </div>
            <SubmitButton text="Set Password" loadingText="Setting password..." />
          </form>
        );

      case 'FORGOT_PASSWORD':
        return (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="mb-4 text-center">
              <h2 className="text-lg font-semibold text-gray-900">Reset Password</h2>
              <p className="mt-1 text-sm text-gray-500">Enter your email to receive a reset code</p>
            </div>
            <ErrorBanner />
            <div className="space-y-1.5">
              <label htmlFor="resetEmail" className="text-sm font-medium text-gray-700">Email</label>
              <input id="resetEmail" type="email" placeholder="you@flatironscap.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" className={inputClass} />
            </div>
            <SubmitButton text="Send Reset Code" loadingText="Sending code..." />
            <BackButton />
          </form>
        );

      case 'CONFIRM_RESET_CODE':
        return (
          <form onSubmit={handleConfirmReset} className="space-y-4">
            <div className="mb-4 text-center">
              <h2 className="text-lg font-semibold text-gray-900">Enter Reset Code</h2>
              <p className="mt-1 text-sm text-gray-500">
                A code was sent to {resetCodeDestination || pendingEmail}
              </p>
            </div>
            <ErrorBanner />
            <div className="space-y-1.5">
              <label htmlFor="resetCode" className="text-sm font-medium text-gray-700">Verification Code</label>
              <input id="resetCode" type="text" placeholder="123456" value={resetCode} onChange={(e) => setResetCode(e.target.value)} required autoComplete="one-time-code" className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="newPasswordReset" className="text-sm font-medium text-gray-700">New Password</label>
              <input id="newPasswordReset" type="password" placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} autoComplete="new-password" className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="confirmPasswordReset" className="text-sm font-medium text-gray-700">Confirm Password</label>
              <input id="confirmPasswordReset" type="password" placeholder="••••••••" value={confirmPasswordValue} onChange={(e) => setConfirmPasswordValue(e.target.value)} required minLength={8} autoComplete="new-password" className={inputClass} />
            </div>
            <SubmitButton text="Reset Password" loadingText="Resetting password..." />
            <BackButton />
          </form>
        );

      default: // LOGIN
        return (
          <form onSubmit={handleLogin} className="space-y-4">
            <ErrorBanner />
            <SuccessBanner />
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-gray-700">Email</label>
              <input id="email" type="email" placeholder="you@flatironscap.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium text-gray-700">Password</label>
              <input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" className={inputClass} />
            </div>
            <SubmitButton text="Sign in" loadingText="Signing in..." />
            <button
              type="button"
              onClick={() => { setError(''); setSuccess(''); startForgotPasswordFlow(); }}
              className="w-full text-center text-sm text-gray-400 transition-colors hover:text-primary"
            >
              Forgot password?
            </button>
          </form>
        );
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <Image
            src="https://d1bjh7dvpwoxii.cloudfront.net/logos/fca-mountain-on-white.png"
            alt="Flatirons Capital Advisors"
            width={64}
            height={64}
            className="mx-auto"
            priority
          />
          <h1 className="mt-4 text-2xl font-bold text-gray-900">Flatirons Capital Advisors</h1>
        </div>

        {/* Form card */}
        <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-xl shadow-blue-900/5">
          {renderForm()}
        </div>
      </div>
    </div>
  );
}
