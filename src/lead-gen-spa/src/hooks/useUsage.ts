import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useUsage() {
  return useQuery({
    queryKey: ['usage'],
    queryFn: () => api.getUsage(),
  });
}

export function useUsageLimits() {
  return useQuery({
    queryKey: ['usage', 'limits'],
    queryFn: () => api.getUsageLimits(),
  });
}
