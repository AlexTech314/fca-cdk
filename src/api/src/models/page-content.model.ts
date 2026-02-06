import { z } from 'zod';

// Create/update page content
export const pageContentSchema = z.object({
  pageKey: z.string().min(1, 'Page key is required'),
  title: z.string().min(1, 'Title is required'),
  content: z.string().default(''),
  metadata: z.record(z.any()).optional(),
});

// Update page content (pageKey is path param)
export const updatePageContentSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

// Page content response
export const pageContentResponseSchema = z.object({
  id: z.string().uuid(),
  pageKey: z.string(),
  title: z.string(),
  content: z.string(),
  metadata: z.record(z.any()).nullable(),
  previewToken: z.string(),
  updatedAt: z.date(),
});

// Types
export type PageContentInput = z.infer<typeof pageContentSchema>;
export type UpdatePageContentInput = z.infer<typeof updatePageContentSchema>;
export type PageContentResponse = z.infer<typeof pageContentResponseSchema>;
