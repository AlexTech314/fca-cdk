import { z } from 'zod';

// ============================================
// ASSET
// ============================================

export const createAssetSchema = z.object({
  fileName: z.string().min(1, 'File name is required'),
  s3Key: z.string().min(1, 'S3 key is required'),
  fileType: z.string().min(1, 'File type is required'),
  fileSize: z.number().int().positive().optional().nullable(),
  category: z.enum(['file', 'photo']).default('file'),
  title: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
});

export const updateAssetSchema = createAssetSchema.partial();

export const assetQuerySchema = z.object({
  category: z.enum(['file', 'photo']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  search: z.string().optional(),
});

export const presignedUrlSchema = z.object({
  fileName: z.string().min(1, 'File name is required'),
  fileType: z.string().min(1, 'File type is required'),
  category: z.enum(['file', 'photo']).default('file'),
  prefix: z.string().optional(), // e.g. 'tombstones', 'awards', etc.
});

export type CreateAssetInput = z.infer<typeof createAssetSchema>;
export type UpdateAssetInput = z.infer<typeof updateAssetSchema>;
export type AssetQuery = z.infer<typeof assetQuerySchema>;
export type PresignedUrlInput = z.infer<typeof presignedUrlSchema>;
