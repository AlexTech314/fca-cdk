import { z } from 'zod';

// Base tombstone schema (shared fields)
const tombstoneBase = {
  name: z.string().min(1, 'Name is required'),
  imagePath: z.string().optional().nullable(),
  industry: z.string().optional().nullable(),
  role: z.string().optional().nullable(),
  buyerPeFirm: z.string().optional().nullable(),
  buyerPlatform: z.string().optional().nullable(),
  transactionYear: z.number().int().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  sortOrder: z.number().int().default(0),
  isPublished: z.boolean().default(true),
};

// Create tombstone input
export const createTombstoneSchema = z.object({
  ...tombstoneBase,
  slug: z.string().optional(), // Auto-generated if not provided
  tagIds: z.array(z.string()).optional(),
  pressReleaseId: z.string().uuid().optional().nullable(),
});

// Update tombstone input
export const updateTombstoneSchema = z.object({
  ...tombstoneBase,
  name: z.string().min(1).optional(),
  tagIds: z.array(z.string()).optional(),
  pressReleaseId: z.string().uuid().optional().nullable(),
}).partial();

// Tombstone list query params
export const tombstoneQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(20),
  industry: z.string().optional(),
  state: z.string().optional(),
  year: z.coerce.number().int().optional(),
  tag: z.string().optional(),
  search: z.string().optional(),
  published: z.coerce.boolean().optional(),
});

// Tombstone response (includes relations)
export const tombstoneResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  imagePath: z.string().nullable(),
  industry: z.string().nullable(),
  role: z.string().nullable(),
  buyerPeFirm: z.string().nullable(),
  buyerPlatform: z.string().nullable(),
  transactionYear: z.number().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  sortOrder: z.number(),
  isPublished: z.boolean(),
  previewToken: z.string(),
  pressReleaseId: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  tags: z.array(z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    category: z.string().nullable(),
  })).optional(),
  pressRelease: z.object({
    id: z.string(),
    slug: z.string(),
    title: z.string(),
  }).nullable().optional(),
});

// Types
export type CreateTombstoneInput = z.infer<typeof createTombstoneSchema>;
export type UpdateTombstoneInput = z.infer<typeof updateTombstoneSchema>;
export type TombstoneQuery = z.infer<typeof tombstoneQuerySchema>;
export type TombstoneResponse = z.infer<typeof tombstoneResponseSchema>;
