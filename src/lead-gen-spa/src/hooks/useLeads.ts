import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { LeadQueryParams, LeadFilters } from '@/types';
import { DEFAULT_LEAD_COLUMNS } from '@/lib/leads/columns';

const PULSE_REFETCH_MS = 10_000;
const pulseQueryOptions = {
  refetchInterval: PULSE_REFETCH_MS,
  refetchIntervalInBackground: false,
} as const;

export function useLeads(params: LeadQueryParams) {
  return useQuery({
    queryKey: ['leads', params],
    queryFn: () => api.getLeads(params),
    ...pulseQueryOptions,
  });
}

export function useLead(id: string) {
  return useQuery({
    queryKey: ['leads', id],
    queryFn: () => api.getLead(id),
    enabled: !!id,
    ...pulseQueryOptions,
  });
}

export function useLeadCount(filters: LeadFilters) {
  return useQuery({
    queryKey: ['leads', 'count', filters],
    queryFn: () => api.getLeadCount({ page: 1, limit: 1, sort: 'createdAt', order: 'desc', filters }),
    ...pulseQueryOptions,
  });
}

export function useQualifyLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.qualifyLead(id),
    onSuccess: (lead) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.setQueryData(['leads', lead.id], lead);
    },
  });
}

export function useQualifyLeadsBulk() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => api.qualifyLeadsBulk(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}

export function useScrapeLeadsBulk() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => api.scrapeLeadsBulk(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}

// Default query params
export const defaultLeadQueryParams: LeadQueryParams = {
  page: 1,
  limit: 25,
  sort: 'createdAt',
  order: 'desc',
  filters: {},
  fields: DEFAULT_LEAD_COLUMNS,
};
