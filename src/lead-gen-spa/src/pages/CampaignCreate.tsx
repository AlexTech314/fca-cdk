import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageContainer } from '@/components/layout/PageContainer';
import { Header } from '@/components/layout/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { QueryEditor } from '@/components/campaigns/QueryEditor';
import { useCampaign, useCreateCampaign, useUpdateCampaign } from '@/hooks/useCampaigns';
import { useEffect } from 'react';

const campaignSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  queries: z.string().min(1, 'At least one query is required'),
});

type CampaignFormData = z.infer<typeof campaignSchema>;

export default function CampaignCreate() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;

  const { data: campaign, isLoading } = useCampaign(id || '');
  const createMutation = useCreateCampaign();
  const updateMutation = useUpdateCampaign();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CampaignFormData>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      name: '',
      description: '',
      queries: '',
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (campaign && isEditing) {
      setValue('name', campaign.name);
      setValue('description', campaign.description || '');
      setValue('queries', campaign.queries.join('\n'));
    }
  }, [campaign, isEditing, setValue]);

  const onSubmit = async (data: CampaignFormData) => {
    const queries = data.queries
      .split('\n')
      .map(q => q.trim())
      .filter(q => q.length > 0);

    if (isEditing && id) {
      await updateMutation.mutateAsync({
        id,
        data: {
          name: data.name,
          description: data.description,
          queries,
        },
      });
      navigate(`/campaigns/${id}`);
    } else {
      const campaign = await createMutation.mutateAsync({
        name: data.name,
        description: data.description,
        queries,
      });
      navigate(`/campaigns/${campaign.id}`);
    }
  };

  const queriesValue = watch('queries');
  const queryCount = queriesValue
    .split('\n')
    .filter(q => q.trim().length > 0).length;

  if (isEditing && isLoading) {
    return (
      <PageContainer title="Loading...">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-muted rounded" />
          <div className="h-32 bg-muted rounded" />
        </div>
      </PageContainer>
    );
  }

  return (
    <>
      <Header 
        breadcrumbs={[
          { label: 'Campaigns', href: '/campaigns' },
          { label: isEditing ? 'Edit Campaign' : 'New Campaign' },
        ]}
      />
      <PageContainer 
        title={isEditing ? 'Edit Campaign' : 'Create Campaign'}
        description={isEditing ? 'Update campaign details and queries' : 'Set up a new lead generation campaign'}
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <Card>
            <CardContent className="pt-6 space-y-6">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Campaign Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Colorado Plumbers"
                  {...register('name')}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Input
                  id="description"
                  placeholder="Brief description of this campaign"
                  {...register('description')}
                />
              </div>

              {/* Queries */}
              <div className="space-y-2">
                <Label>Search Queries</Label>
                <QueryEditor
                  value={queriesValue}
                  onChange={(value) => setValue('queries', value)}
                  queryCount={queryCount}
                />
                {errors.queries && (
                  <p className="text-sm text-destructive">{errors.queries.message}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/campaigns')}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Saving...'
                    : isEditing
                    ? 'Update Campaign'
                    : 'Create Campaign'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </PageContainer>
    </>
  );
}
