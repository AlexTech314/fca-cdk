import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { UpdatePageContentInput } from '@/types';

export function usePages() {
  return useQuery({
    queryKey: ['pages'],
    queryFn: () => api.getPages(),
  });
}

export function usePage(pageKey: string | undefined) {
  return useQuery({
    queryKey: ['pages', pageKey],
    queryFn: () => api.getPage(pageKey!),
    enabled: !!pageKey,
  });
}

export function useUpdatePage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ pageKey, input }: { pageKey: string; input: UpdatePageContentInput }) =>
      api.updatePage(pageKey, input),
    onSuccess: (_, { pageKey }) => {
      queryClient.invalidateQueries({ queryKey: ['pages'] });
      queryClient.invalidateQueries({ queryKey: ['pages', pageKey] });
    },
  });
}
