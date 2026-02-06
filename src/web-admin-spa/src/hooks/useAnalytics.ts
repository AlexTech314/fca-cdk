import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { AnalyticsParams } from '@/types';

export function usePageViews(params: AnalyticsParams) {
  return useQuery({
    queryKey: ['analytics', 'pageViews', params],
    queryFn: () => api.analytics.getPageViews(params),
  });
}

export function useTopPages(params: AnalyticsParams & { limit?: number }) {
  return useQuery({
    queryKey: ['analytics', 'topPages', params],
    queryFn: () => api.analytics.getTopPages(params),
  });
}
