import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { LeadQueryParams, LeadFilters } from '@/types';

export function useLeads(params: LeadQueryParams) {
  return useQuery({
    queryKey: ['leads', params],
    queryFn: () => api.getLeads(params),
  });
}

export function useLead(id: string) {
  return useQuery({
    queryKey: ['leads', id],
    queryFn: () => api.getLead(id),
    enabled: !!id,
  });
}

export function useLeadCount(filters: LeadFilters) {
  return useQuery({
    queryKey: ['leads', 'count', filters],
    queryFn: () => api.getLeadCount({ page: 1, limit: 1, sort: 'createdAt', order: 'desc', filters }),
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

// Default query params
export const defaultLeadQueryParams: LeadQueryParams = {
  page: 1,
  limit: 25,
  sort: 'createdAt',
  order: 'desc',
  filters: {},
};
