'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/admin/AuthContext';
import { AuthGuard } from './AuthGuard';
import { AdminHeader } from './AdminHeader';
import { AdminSidebar } from './AdminSidebar';
import { UnsavedChangesProvider } from './UnsavedChangesContext';
import { UnsavedChangesModal } from './UnsavedChangesModal';

/**
 * Admin shell — handles auth + layout chrome.
 *
 * - Login page: renders children directly (no header/sidebar/auth guard)
 * - All other pages: wraps in AuthGuard + admin chrome
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isLoading } = useAuth();

  // Login page renders without admin chrome but still covers the public header
  if (pathname === '/admin/login') {
    return <div className="fixed inset-0 z-[100]">{children}</div>;
  }

  // Loading state while checking auth
  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-surface">
        <div className="text-center">
          <svg
            className="mx-auto h-8 w-8 animate-spin text-primary"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="mt-4 text-sm text-text-muted">Loading...</p>
        </div>
      </div>
    );
  }

  // Authenticated admin pages with full chrome
  return (
    <AuthGuard>
      <UnsavedChangesProvider>
        <div className="fixed inset-0 z-[100] flex flex-col bg-surface">
          <AdminHeader />
          <div className="flex flex-1 overflow-hidden">
            <AdminSidebar />
            <main className="flex-1 overflow-y-auto">
              {children}
            </main>
          </div>
        </div>
        <UnsavedChangesModal />
      </UnsavedChangesProvider>
    </AuthGuard>
  );
}
