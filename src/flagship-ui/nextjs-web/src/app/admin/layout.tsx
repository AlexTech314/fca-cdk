import { AdminHeader } from '@/components/admin/AdminHeader';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { UnsavedChangesProvider } from '@/components/admin/UnsavedChangesContext';
import { UnsavedChangesModal } from '@/components/admin/UnsavedChangesModal';

export const metadata = {
  title: 'Admin Dashboard | Flatirons Capital Advisors',
};

/**
 * Admin layout renders as a full-viewport overlay that covers the public
 * Header/Footer from the root layout. This avoids needing to refactor all
 * public routes into a (public) route group.
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
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
  );
}
