import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { UpdateIntakeStatusInput } from '@/types';

export function useIntakes() {
  return useQuery({
    queryKey: ['intakes'],
    queryFn: () => api.getIntakes(),
  });
}

export function useIntake(id: string | undefined) {
  return useQuery({
    queryKey: ['intakes', id],
    queryFn: () => api.getIntake(id!),
    enabled: !!id,
  });
}

export function useUpdateIntakeStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateIntakeStatusInput }) =>
      api.updateIntakeStatus(id, input),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['intakes'] });
      queryClient.invalidateQueries({ queryKey: ['intakes', id] });
    },
  });
}

export function useExportIntakes() {
  return useMutation({
    mutationFn: () => api.exportIntakes(),
    onSuccess: (blob) => {
      // Download the file
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `intakes-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
  });
}
