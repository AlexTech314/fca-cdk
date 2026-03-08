import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useStates() {
  return useQuery({
    queryKey: ['locations', 'states'],
    queryFn: () => api.getLocationsStates(),
    staleTime: 5 * 60 * 1000,
  });
}
