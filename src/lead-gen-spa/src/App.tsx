import { Routes, Route, Navigate, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Sidebar } from '@/components/layout/Sidebar'
import { PageContainer } from '@/components/layout/PageContainer'
import { Button } from '@/components/ui/button'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import Leads from '@/pages/Leads'
import LeadDetail from '@/pages/LeadDetail'
import Campaigns from '@/pages/Campaigns'
import CampaignDetail from '@/pages/CampaignDetail'
import CampaignCreate from '@/pages/CampaignCreate'
import Franchises from '@/pages/Franchises'
import FranchiseDetail from '@/pages/FranchiseDetail'
import Admin from '@/pages/Admin'
import Export from '@/pages/Export'
import Settings from '@/pages/Settings'
import Tasks from '@/pages/Tasks'
import ScrapedPageMarkdown from '@/pages/ScrapedPageMarkdown'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AuthenticatedLayout() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-x-hidden">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/leads" element={<Leads />} />
          <Route path="/leads/:leadId/scraped-page/:pageId/markdown" element={<ScrapedPageMarkdown />} />
          <Route path="/leads/:id" element={<LeadDetail />} />
          <Route path="/campaigns" element={<Campaigns />} />
          <Route path="/campaigns/new" element={<CampaignCreate />} />
          <Route path="/campaigns/:id/edit" element={<CampaignCreate />} />
          <Route path="/campaigns/:id" element={<CampaignDetail />} />
          <Route path="/franchises" element={<Franchises />} />
          <Route path="/franchises/:id" element={<FranchiseDetail />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/export" element={<Export />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={
            <PageContainer title="Page Not Found">
              <p className="text-muted-foreground">The page you're looking for doesn't exist.</p>
              <Button asChild className="mt-4">
                <Link to="/">Go to Dashboard</Link>
              </Button>
            </PageContainer>
          } />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AuthenticatedLayout />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default App
