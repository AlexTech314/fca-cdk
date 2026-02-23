import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { TimeSeriesParams } from '@/types';

const PULSE_REFETCH_MS = 10_000;
const pulseQueryOptions = {
  refetchInterval: PULSE_REFETCH_MS,
  refetchIntervalInBackground: false,
} as const;

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => api.getDashboardStats(),
    ...pulseQueryOptions,
  });
}

export function useLeadsOverTime(params: TimeSeriesParams) {
  return useQuery({
    queryKey: ['dashboard', 'leads-over-time', params],
    queryFn: () => api.getLeadsOverTime(params),
    ...pulseQueryOptions,
  });
}

export function useCampaignsOverTime(params: TimeSeriesParams) {
  return useQuery({
    queryKey: ['dashboard', 'campaigns-over-time', params],
    queryFn: () => api.getCampaignsOverTime(params),
    ...pulseQueryOptions,
  });
}

export function useBusinessTypeDistribution() {
  return useQuery({
    queryKey: ['dashboard', 'business-type-distribution'],
    queryFn: () => api.getBusinessTypeDistribution(),
    ...pulseQueryOptions,
  });
}

export function useLocationDistribution() {
  return useQuery({
    queryKey: ['dashboard', 'location-distribution'],
    queryFn: () => api.getLocationDistribution(),
    ...pulseQueryOptions,
  });
}
