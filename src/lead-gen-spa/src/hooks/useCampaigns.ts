import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CreateCampaignInput, UpdateCampaignInput } from '@/types';

const PULSE_REFETCH_MS = 10_000;
const pulseQueryOptions = {
  refetchInterval: PULSE_REFETCH_MS,
  refetchIntervalInBackground: false,
} as const;

export function useCampaigns() {
  return useQuery({
    queryKey: ['campaigns'],
    queryFn: () => api.getCampaigns(),
    ...pulseQueryOptions,
  });
}

export function useCampaign(id: string) {
  return useQuery({
    queryKey: ['campaigns', id],
    queryFn: () => api.getCampaign(id),
    enabled: !!id,
    ...pulseQueryOptions,
  });
}

export function useCampaignRuns(campaignId: string) {
  return useQuery({
    queryKey: ['campaigns', campaignId, 'runs'],
    queryFn: () => api.getCampaignRuns(campaignId),
    enabled: !!campaignId,
    ...pulseQueryOptions,
  });
}

export function useCreateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCampaignInput) => api.createCampaign(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });
}

export function useUpdateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCampaignInput }) => 
      api.updateCampaign(id, data),
    onSuccess: (campaign) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.setQueryData(['campaigns', campaign.id], campaign);
    },
  });
}

export function useDeleteCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.deleteCampaign(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });
}

export function useStartCampaignRun() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (campaignId: string) => api.startCampaignRun(campaignId),
    onSuccess: (run) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', run.campaignId, 'runs'] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });
}
