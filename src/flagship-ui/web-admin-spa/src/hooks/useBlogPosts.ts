import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CreateBlogPostInput, UpdateBlogPostInput } from '@/types';

export function useBlogPosts(category?: string) {
  return useQuery({
    queryKey: ['blogPosts', category || 'all'],
    queryFn: () => api.blogPosts.getAll(category),
  });
}

export function useNewsArticles() {
  return useQuery({
    queryKey: ['blogPosts', 'news'],
    queryFn: () => api.blogPosts.getNews(),
  });
}

export function useResourceArticles() {
  return useQuery({
    queryKey: ['blogPosts', 'resource'],
    queryFn: () => api.blogPosts.getResources(),
  });
}

export function useBlogPost(id: string | undefined) {
  return useQuery({
    queryKey: ['blogPosts', id],
    queryFn: () => api.blogPosts.getById(id!),
    enabled: !!id,
  });
}

export function useCreateBlogPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateBlogPostInput) => api.blogPosts.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blogPosts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateBlogPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateBlogPostInput }) =>
      api.blogPosts.update(id, input),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['blogPosts'] });
      queryClient.invalidateQueries({ queryKey: ['blogPosts', id] });
    },
  });
}

export function useDeleteBlogPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.blogPosts.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blogPosts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function usePublishBlogPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isPublished }: { id: string; isPublished: boolean }) =>
      api.blogPosts.publish(id, isPublished),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['blogPosts'] });
      queryClient.invalidateQueries({ queryKey: ['blogPosts', id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
