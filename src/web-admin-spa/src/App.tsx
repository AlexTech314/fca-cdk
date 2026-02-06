import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Sidebar } from '@/components/layout/Sidebar';
import { Skeleton } from '@/components/ui/skeleton';

// Pages
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Tombstones from '@/pages/Tombstones';
import TombstoneForm from '@/pages/TombstoneForm';
import BlogPosts from '@/pages/BlogPosts';
import Resources from '@/pages/Resources';
import PageContent from '@/pages/PageContent';
import ContentEditor from '@/pages/ContentEditor';
import Analytics from '@/pages/Analytics';
import Subscribers from '@/pages/Subscribers';
import SellerIntakes from '@/pages/SellerIntakes';
import EmailCompose from '@/pages/EmailCompose';
import Settings from '@/pages/Settings';
import Admin from '@/pages/Admin';

// Static page editors
import HomePage from '@/pages/static/HomePage';
import AboutPage from '@/pages/static/AboutPage';
import TeamPage from '@/pages/static/TeamPage';
import FAQPage from '@/pages/static/FAQPage';
import ServicesPage from '@/pages/static/ServicesPage';
import IndustriesPage from '@/pages/static/IndustriesPage';
import CommunityPage from '@/pages/static/CommunityPage';
import CoreValuesPage from '@/pages/static/CoreValuesPage';

// Create query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

// Protected route wrapper
function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="space-y-4 text-center">
          <Skeleton className="h-12 w-12 rounded-full mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

// Authenticated layout with sidebar
function AuthenticatedLayout() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}

// App routes
function AppRoutes() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="space-y-4 text-center">
          <Skeleton className="h-12 w-12 rounded-full mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/login"
        element={
          isAuthenticated ? <Navigate to="/" replace /> : <Login />
        }
      />

      {/* Protected routes */}
      <Route element={<ProtectedRoute />}>
        {/* Full-page content editor (no sidebar) */}
        <Route path="/content/:type/:id" element={<ContentEditor />} />

        {/* Standard layout with sidebar */}
        <Route element={<AuthenticatedLayout />}>
          <Route path="/" element={<Dashboard />} />
          
          {/* Content */}
          <Route path="/transactions" element={<Tombstones />} />
          <Route path="/transactions/new" element={<TombstoneForm />} />
          <Route path="/transactions/:id/edit" element={<TombstoneForm />} />
          <Route path="/news" element={<BlogPosts />} />
          <Route path="/resources" element={<Resources />} />
          
          {/* Static Pages */}
          <Route path="/pages/home" element={<HomePage />} />
          <Route path="/pages/about" element={<AboutPage />} />
          <Route path="/pages/team" element={<TeamPage />} />
          <Route path="/pages/faq" element={<FAQPage />} />
          <Route path="/pages/services" element={<ServicesPage />} />
          <Route path="/pages/industries" element={<IndustriesPage />} />
          <Route path="/pages/community" element={<CommunityPage />} />
          <Route path="/pages/core-values" element={<CoreValuesPage />} />
          
          {/* Legacy route for generic page content */}
          <Route path="/pages" element={<PageContent />} />
          
          {/* Data */}
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/subscribers" element={<Subscribers />} />
          <Route path="/intakes" element={<SellerIntakes />} />
          <Route path="/email/compose" element={<EmailCompose />} />
          
          {/* System */}
          <Route path="/settings" element={<Settings />} />
          <Route path="/admin" element={<Admin />} />
        </Route>
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <TooltipProvider>
            <AppRoutes />
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
