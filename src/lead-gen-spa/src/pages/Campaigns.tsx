import { Link } from 'react-router-dom';
import { PageContainer } from '@/components/layout/PageContainer';
import { CampaignTable } from '@/components/campaigns/CampaignTable';
import { Button } from '@/components/ui/button';
import { useCampaigns } from '@/hooks/useCampaigns';
import { useAuth } from '@/hooks/useAuth';
import { Plus } from 'lucide-react';

export default function Campaigns() {
  const { data: campaigns, isLoading } = useCampaigns();
  const { canWrite } = useAuth();

  return (
    <PageContainer 
      title="Campaigns"
      description="Manage your lead generation campaigns"
      actions={
        canWrite && (
          <Button asChild>
            <Link to="/campaigns/new">
              <Plus className="mr-2 h-4 w-4" />
              New Campaign
            </Link>
          </Button>
        )
      }
    >
      <CampaignTable 
        data={campaigns || []} 
        isLoading={isLoading} 
      />
    </PageContainer>
  );
}
