import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { SendEmailInput } from '@/types';

export function useEmailHistory() {
  return useQuery({
    queryKey: ['email', 'history'],
    queryFn: () => api.email.getHistory(),
  });
}

export function useSendEmail() {
  return useMutation({
    mutationFn: (input: SendEmailInput) => api.email.send(input),
  });
}

export function usePreviewEmail() {
  return useMutation({
    mutationFn: (input: SendEmailInput) => api.email.preview(input),
  });
}
