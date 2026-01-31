import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CreateSubscriberInput } from '@/types';

export function useSubscribers() {
  return useQuery({
    queryKey: ['subscribers'],
    queryFn: () => api.getSubscribers(),
  });
}

export function useCreateSubscriber() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateSubscriberInput) => api.createSubscriber(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscribers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteSubscriber() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.deleteSubscriber(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscribers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useExportSubscribers() {
  return useMutation({
    mutationFn: () => api.exportSubscribers(),
    onSuccess: (blob) => {
      // Download the file
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `subscribers-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
  });
}

export function useImportSubscribers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => api.importSubscribers(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscribers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
