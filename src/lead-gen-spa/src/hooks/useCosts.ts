import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

const COST_REFETCH_MS = 5 * 60 * 1000; // 5 minutes (data changes infrequently)
const costQueryOptions = {
  refetchInterval: COST_REFETCH_MS,
  refetchIntervalInBackground: false,
  staleTime: COST_REFETCH_MS,
} as const;

export function useCostSummary(start?: string, end?: string) {
  return useQuery({
    queryKey: ['costs', 'summary', start, end],
    queryFn: () => api.getCostSummary(start, end),
    ...costQueryOptions,
  });
}

export function useCostsByService(start?: string, end?: string) {
  return useQuery({
    queryKey: ['costs', 'by-service', start, end],
    queryFn: () => api.getCostsByService(start, end),
    ...costQueryOptions,
  });
}

export function useCostsByResource(start?: string, end?: string, service?: string) {
  return useQuery({
    queryKey: ['costs', 'by-resource', start, end, service],
    queryFn: () => api.getCostsByResource(start, end, service),
    ...costQueryOptions,
  });
}

export function useCostsOverTime(start?: string, end?: string, granularity?: 'daily' | 'monthly') {
  return useQuery({
    queryKey: ['costs', 'over-time', start, end, granularity],
    queryFn: () => api.getCostsOverTime(start, end, granularity),
    ...costQueryOptions,
  });
}

export function useCostsOverTimeByService(start?: string, end?: string) {
  return useQuery({
    queryKey: ['costs', 'over-time-by-service', start, end],
    queryFn: () => api.getCostsOverTimeByService(start, end),
    ...costQueryOptions,
  });
}
