import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useFranchises() {
  return useQuery({
    queryKey: ['franchises'],
    queryFn: () => api.getFranchises(),
  });
}

export function useFranchise(id: string) {
  return useQuery({
    queryKey: ['franchise', id],
    queryFn: () => api.getFranchise(id),
    enabled: !!id,
  });
}
