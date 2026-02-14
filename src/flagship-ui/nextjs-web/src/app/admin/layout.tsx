import { AuthProvider } from '@/contexts/admin/AuthContext';
import { AdminShell } from '@/components/admin/AdminShell';
import './admin.css';

export const metadata = {
  title: 'Admin Dashboard | Flatirons Capital Advisors',
};

/**
 * Admin layout.
 *
 * AuthProvider gives all admin pages access to auth state.
 * AdminShell handles the auth guard + layout chrome:
 *   - /admin/login renders without header/sidebar
 *   - All other routes redirect to login if unauthenticated
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <AdminShell>{children}</AdminShell>
    </AuthProvider>
  );
}
