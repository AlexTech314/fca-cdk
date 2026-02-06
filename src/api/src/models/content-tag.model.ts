import { z } from 'zod';

// Create content tag input
export const createContentTagSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().optional(), // Auto-generated if not provided
  category: z.enum(['industry', 'service-type', 'deal-type']).optional().nullable(),
  description: z.string().optional().nullable(),
  keywords: z.array(z.string()).default([]),
});

// Update content tag input
export const updateContentTagSchema = createContentTagSchema.partial();

// Content tag response
export const contentTagResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  category: z.string().nullable(),
  description: z.string().nullable(),
  keywords: z.array(z.string()),
  createdAt: z.date(),
});

// Types
export type CreateContentTagInput = z.infer<typeof createContentTagSchema>;
export type UpdateContentTagInput = z.infer<typeof updateContentTagSchema>;
export type ContentTagResponse = z.infer<typeof contentTagResponseSchema>;
