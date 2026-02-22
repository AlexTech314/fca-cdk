import { z } from 'zod';

// Base tombstone schema (shared fields)
const tombstoneBase = {
  name: z.string().min(1, 'Name is required'),
  assetId: z.string().uuid().optional().nullable(),
  role: z.string().optional().nullable(),
  buyerPeFirm: z.string().optional().nullable(),
  buyerPlatform: z.string().optional().nullable(),
  transactionYear: z.number().int().optional().nullable(),
  sortOrder: z.number().int().default(0),
  isPublished: z.boolean().default(true),
};

// Create tombstone input
export const createTombstoneSchema = z.object({
  ...tombstoneBase,
  slug: z.string().optional(),
  industryIds: z.array(z.string()).optional(),
  dealTypeIds: z.array(z.string()).optional(),
  pressReleaseId: z.string().uuid().optional().nullable(),
});

// Update tombstone input
export const updateTombstoneSchema = z.object({
  ...tombstoneBase,
  name: z.string().min(1).optional(),
  industryIds: z.array(z.string()).optional(),
  dealTypeIds: z.array(z.string()).optional(),
  pressReleaseId: z.string().uuid().optional().nullable(),
}).partial();

// Tombstone list query params
export const tombstoneQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(20),
  industry: z.string().optional(),
  state: z.string().optional(),
  city: z.string().optional(),
  year: z.coerce.number().int().optional(),
  search: z.string().optional(),
  published: z.coerce.boolean().optional(),
});

// Tombstone response (includes relations)
export const tombstoneResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  assetId: z.string().uuid().nullable(),
  role: z.string().nullable(),
  buyerPeFirm: z.string().nullable(),
  buyerPlatform: z.string().nullable(),
  transactionYear: z.number().nullable(),
  sortOrder: z.number(),
  isPublished: z.boolean(),
  pressReleaseId: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  industries: z.array(z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
  })).optional(),
  dealTypes: z.array(z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
  })).optional(),
  asset: z.object({
    id: z.string(),
    s3Key: z.string(),
    fileName: z.string(),
    fileType: z.string(),
  }).nullable().optional(),
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
