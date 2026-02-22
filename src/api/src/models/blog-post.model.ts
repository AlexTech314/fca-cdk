import { z } from 'zod';

// Base blog post schema
const blogPostBase = {
  title: z.string().min(1, 'Title is required'),
  excerpt: z.string().optional().nullable(),
  content: z.string().min(1, 'Content is required'),
  author: z.string().optional().nullable(),
  category: z.enum(['news', 'resource', 'article']).optional().nullable(),
  publishedAt: z.coerce.date().optional().nullable(),
  isPublished: z.boolean().default(false),
};

// Create blog post input
export const createBlogPostSchema = z.object({
  ...blogPostBase,
  slug: z.string().optional(),
  industryIds: z.array(z.string()).optional(),
});

// Update blog post input
export const updateBlogPostSchema = z.object({
  ...blogPostBase,
  title: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  industryIds: z.array(z.string()).optional(),
}).partial();

// Blog post list query params
export const blogPostQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(20),
  category: z.string().optional(),
  industry: z.string().optional(),
  search: z.string().optional(),
  published: z.coerce.boolean().optional(),
  author: z.string().optional(),
});

// Blog post response
export const blogPostResponseSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  title: z.string(),
  excerpt: z.string().nullable(),
  content: z.string(),
  author: z.string().nullable(),
  category: z.string().nullable(),
  publishedAt: z.date().nullable(),
  isPublished: z.boolean(),
  previewToken: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  industries: z.array(z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
  })).optional(),
  tombstone: z.object({
    id: z.string(),
    slug: z.string(),
    name: z.string(),
  }).nullable().optional(),
});

// Types
export type CreateBlogPostInput = z.infer<typeof createBlogPostSchema>;
export type UpdateBlogPostInput = z.infer<typeof updateBlogPostSchema>;
export type BlogPostQuery = z.infer<typeof blogPostQuerySchema>;
export type BlogPostResponse = z.infer<typeof blogPostResponseSchema>;
