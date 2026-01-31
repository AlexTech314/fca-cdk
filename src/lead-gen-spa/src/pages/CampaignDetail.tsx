import { useParams, Link } from 'react-router-dom';
import { PageContainer } from '@/components/layout/PageContainer';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CampaignRunHistory } from '@/components/campaigns/CampaignRunHistory';
import { RunCampaignDialog } from '@/components/campaigns/RunCampaignDialog';
import { useCampaign, useCampaignRuns, useStartCampaignRun } from '@/hooks/useCampaigns';
import { useAuth } from '@/hooks/useAuth';
import { formatDate, formatNumber } from '@/lib/utils';
import { Edit, Play, Search } from 'lucide-react';
import { useState } from 'react';

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: campaign, isLoading } = useCampaign(id || '');
  const { data: runs, isLoading: runsLoading } = useCampaignRuns(id || '');
  const startRunMutation = useStartCampaignRun();
  const { canWrite } = useAuth();
  const [showRunDialog, setShowRunDialog] = useState(false);

  if (isLoading) {
    return (
      <>
        <Header breadcrumbs={[
          { label: 'Campaigns', href: '/campaigns' },
          { label: 'Loading...' },
        ]} />
        <PageContainer>
          <div className="grid gap-6 lg:grid-cols-2">
            {[1, 2].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-32 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </PageContainer>
      </>
    );
  }

  if (!campaign) {
    return (
      <PageContainer title="Campaign Not Found">
        <p className="text-muted-foreground">The requested campaign could not be found.</p>
        <Button asChild className="mt-4">
          <Link to="/campaigns">Back to Campaigns</Link>
        </Button>
      </PageContainer>
    );
  }

  const handleStartRun = async () => {
    await startRunMutation.mutateAsync(campaign.id);
    setShowRunDialog(false);
  };

  // Calculate stats from runs
  const completedRuns = runs?.filter(r => r.status === 'completed') || [];
  const totalLeads = completedRuns.reduce((sum, r) => sum + r.leadsFound, 0);
  const lastRun = runs?.[0];

  return (
    <>
      <Header 
        breadcrumbs={[
          { label: 'Campaigns', href: '/campaigns' },
          { label: campaign.name },
        ]}
        actions={
          canWrite && (
            <div className="flex items-center gap-2">
              <Button variant="outline" asChild>
                <Link to={`/campaigns/${campaign.id}/edit`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Link>
              </Button>
              <Button onClick={() => setShowRunDialog(true)}>
                <Play className="mr-2 h-4 w-4" />
                Run Campaign
              </Button>
            </div>
          )
        }
      />
      <PageContainer>
        {/* Campaign Info */}
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Campaign Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold">{campaign.name}</h2>
                {campaign.description && (
                  <p className="mt-1 text-muted-foreground">{campaign.description}</p>
                )}
              </div>
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span>Created {formatDate(campaign.createdAt)}</span>
                {lastRun && (
                  <span>Last run {formatDate(lastRun.startedAt)}</span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Queries</span>
                <span className="font-mono font-semibold">{campaign.queries.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Runs</span>
                <span className="font-mono font-semibold">{runs?.length || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Leads Generated</span>
                <span className="font-mono font-semibold">{formatNumber(totalLeads)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Query List */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="h-4 w-4" />
              Search Queries ({campaign.queries.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48">
              <div className="space-y-2">
                {campaign.queries.map((query, index) => (
                  <div 
                    key={index}
                    className="flex items-center gap-3 rounded-lg bg-muted px-3 py-2 text-sm"
                  >
                    <Badge variant="outline" className="font-mono text-xs">
                      {index + 1}
                    </Badge>
                    {query}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Run History */}
        <Card className="mt-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Run History</CardTitle>
            {canWrite && (
              <Button size="sm" onClick={() => setShowRunDialog(true)}>
                <Play className="mr-2 h-4 w-4" />
                Run Now
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <CampaignRunHistory 
              runs={runs || []} 
              isLoading={runsLoading}
            />
          </CardContent>
        </Card>

        {/* Run Dialog */}
        <RunCampaignDialog
          open={showRunDialog}
          onOpenChange={setShowRunDialog}
          campaign={campaign}
          onConfirm={handleStartRun}
          isLoading={startRunMutation.isPending}
        />
      </PageContainer>
    </>
  );
}
