import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CreateTombstoneInput, UpdateTombstoneInput } from '@/types';

export function useTombstones() {
  return useQuery({
    queryKey: ['tombstones'],
    queryFn: () => api.getTombstones(),
  });
}

export function useTombstone(id: string | undefined) {
  return useQuery({
    queryKey: ['tombstones', id],
    queryFn: () => api.getTombstone(id!),
    enabled: !!id,
  });
}

export function useCreateTombstone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTombstoneInput) => api.createTombstone(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tombstones'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateTombstone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTombstoneInput }) =>
      api.updateTombstone(id, input),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['tombstones'] });
      queryClient.invalidateQueries({ queryKey: ['tombstones', id] });
    },
  });
}

export function useDeleteTombstone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.deleteTombstone(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tombstones'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function usePublishTombstone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isPublished }: { id: string; isPublished: boolean }) =>
      api.publishTombstone(id, isPublished),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['tombstones'] });
      queryClient.invalidateQueries({ queryKey: ['tombstones', id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useReorderTombstones() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => api.reorderTombstones(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tombstones'] });
    },
  });
}
