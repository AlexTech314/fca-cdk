import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { TimeSeriesParams } from '@/types';

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => api.getDashboardStats(),
  });
}

export function useLeadsOverTime(params: TimeSeriesParams) {
  return useQuery({
    queryKey: ['dashboard', 'leads-over-time', params],
    queryFn: () => api.getLeadsOverTime(params),
  });
}

export function useCampaignsOverTime(params: TimeSeriesParams) {
  return useQuery({
    queryKey: ['dashboard', 'campaigns-over-time', params],
    queryFn: () => api.getCampaignsOverTime(params),
  });
}

export function useBusinessTypeDistribution() {
  return useQuery({
    queryKey: ['dashboard', 'business-type-distribution'],
    queryFn: () => api.getBusinessTypeDistribution(),
  });
}

export function useLocationDistribution() {
  return useQuery({
    queryKey: ['dashboard', 'location-distribution'],
    queryFn: () => api.getLocationDistribution(),
  });
}
