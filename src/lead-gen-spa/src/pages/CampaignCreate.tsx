import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageContainer } from '@/components/layout/PageContainer';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { QueryEditor } from '@/components/campaigns/QueryEditor';
import { GenerateQueriesModal } from '@/components/campaigns/GenerateQueriesModal';
import { useCampaign, useCreateCampaign, useUpdateCampaign } from '@/hooks/useCampaigns';
import { useEffect, useState } from 'react';
import { Wand2 } from 'lucide-react';
import { formatNumber } from '@/lib/utils';

const campaignSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  queries: z.array(z.string()).min(1, 'At least one query is required'),
  maxResultsPerSearch: z.number().int().min(1).max(60).optional(),
  maxTotalRequests: z.number().int().min(1).optional(),
  enableWebScraping: z.boolean().optional(),
  enableContactExtraction: z.boolean().optional(),
  enableAiScoring: z.boolean().optional(),
});

type CampaignFormData = z.infer<typeof campaignSchema>;

export default function CampaignCreate() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;
  const [generateOpen, setGenerateOpen] = useState(false);

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
      queries: [],
      maxResultsPerSearch: 60,
      maxTotalRequests: 500,
      enableWebScraping: true,
      enableContactExtraction: false,
      enableAiScoring: false,
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (campaign && isEditing) {
      setValue('name', campaign.name);
      setValue('description', campaign.description || '');
      setValue('queries', campaign.queries);
      setValue('maxResultsPerSearch', campaign.maxResultsPerSearch ?? 60);
      setValue('maxTotalRequests', campaign.maxTotalRequests ?? 500);
      setValue('enableWebScraping', campaign.enableWebScraping ?? true);
      setValue('enableContactExtraction', campaign.enableContactExtraction ?? false);
      setValue('enableAiScoring', campaign.enableAiScoring ?? false);
    }
  }, [campaign, isEditing, setValue]);

  const queries = watch('queries');

  const onSubmit = async (data: CampaignFormData) => {
    if (isEditing && id) {
      await updateMutation.mutateAsync({
        id,
        data: {
          name: data.name,
          description: data.description,
          queries: data.queries,
          maxResultsPerSearch: data.maxResultsPerSearch && !Number.isNaN(data.maxResultsPerSearch) ? data.maxResultsPerSearch : undefined,
          maxTotalRequests: data.maxTotalRequests && !Number.isNaN(data.maxTotalRequests) ? data.maxTotalRequests : undefined,
          enableWebScraping: data.enableWebScraping,
          enableContactExtraction: data.enableContactExtraction,
          enableAiScoring: data.enableAiScoring,
        },
      });
      navigate(`/campaigns/${id}`);
    } else {
      const campaign = await createMutation.mutateAsync({
        name: data.name,
        description: data.description,
        queries: data.queries,
        maxResultsPerSearch: data.maxResultsPerSearch && !Number.isNaN(data.maxResultsPerSearch) ? data.maxResultsPerSearch : undefined,
        maxTotalRequests: data.maxTotalRequests && !Number.isNaN(data.maxTotalRequests) ? data.maxTotalRequests : undefined,
        enableWebScraping: data.enableWebScraping,
        enableContactExtraction: data.enableContactExtraction,
        enableAiScoring: data.enableAiScoring,
      });
      navigate(`/campaigns/${campaign.id}`);
    }
  };

  const handleGenerateQueries = (generated: string[]) => {
    const current = watch('queries');
    setValue('queries', [...current, ...generated], { shouldValidate: true });
  };

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
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Card 1: Campaign Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Campaign Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Input
                  id="description"
                  placeholder="Brief description of this campaign"
                  {...register('description')}
                />
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Search Queries */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  Search Queries
                  {queries.length > 0 && (
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      ({formatNumber(queries.length)})
                    </span>
                  )}
                </CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setGenerateOpen(true)}
                >
                  <Wand2 className="h-4 w-4 mr-2" />
                  Generate Queries
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <QueryEditor
                queries={queries}
                onChange={(q) => setValue('queries', q, { shouldValidate: true })}
              />
              {errors.queries && (
                <p className="text-sm text-destructive mt-2">{errors.queries.message}</p>
              )}
            </CardContent>
          </Card>

          {/* Card 3: Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="maxResultsPerSearch">Max Results Per Query (1-60)</Label>
                  <Input
                    id="maxResultsPerSearch"
                    type="number"
                    min={1}
                    max={60}
                    {...register('maxResultsPerSearch', { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxTotalRequests">Total Request Budget</Label>
                  <Input
                    id="maxTotalRequests"
                    type="number"
                    min={1}
                    placeholder="e.g., 500"
                    {...register('maxTotalRequests', { valueAsNumber: true })}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-4 rounded-lg border p-4">
                <Label>Pipeline Options</Label>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="enableWebScraping"
                    checked={watch('enableWebScraping') ?? true}
                    onCheckedChange={(checked) => setValue('enableWebScraping', !!checked)}
                  />
                  <Label htmlFor="enableWebScraping" className="font-normal cursor-pointer">
                    Enable Web Scraping — enrich leads by scraping their websites
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="enableContactExtraction"
                    checked={watch('enableContactExtraction') ?? false}
                    onCheckedChange={(checked) => setValue('enableContactExtraction', !!checked)}
                  />
                  <Label htmlFor="enableContactExtraction" className="font-normal cursor-pointer">
                    Enable Contact Extraction — extract contact names from scraped pages
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="enableAiScoring"
                    checked={watch('enableAiScoring') ?? false}
                    onCheckedChange={(checked) => setValue('enableAiScoring', !!checked)}
                  />
                  <Label htmlFor="enableAiScoring" className="font-normal cursor-pointer">
                    Enable AI Scoring — score leads using Claude after scraping
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-2">
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
        </form>
      </PageContainer>

      <GenerateQueriesModal
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        onGenerate={handleGenerateQueries}
      />
    </>
  );
}
