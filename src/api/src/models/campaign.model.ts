import { z } from 'zod';

// Create campaign input
export const createCampaignSchema = z.object({
  name: z.string().min(1, 'Campaign name is required'),
  description: z.string().optional().nullable(),
  maxResultsPerSearch: z.number().int().min(1).max(60).optional(),
  maxTotalRequests: z.number().int().min(1).optional(),
  enableWebScraping: z.boolean().optional(),
  enableAiScoring: z.boolean().optional(),
});

// Update campaign input
export const updateCampaignSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  maxResultsPerSearch: z.number().int().min(1).max(60).optional(),
  maxTotalRequests: z.number().int().min(1).optional(),
  enableWebScraping: z.boolean().optional(),
  enableAiScoring: z.boolean().optional(),
  updateSearches: z.boolean().optional(), // If true, return presigned URL for new searches upload
});

// Confirm searches upload
export const confirmUploadSchema = z.object({
  searchesCount: z.number().int().min(0),
});

// Start campaign run
export const startCampaignRunSchema = z.object({
  skipCachedSearches: z.boolean().optional(),
  maxResultsPerSearch: z.number().int().min(1).max(60).optional(),
});

// Types
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
export type ConfirmUploadInput = z.infer<typeof confirmUploadSchema>;
export type StartCampaignRunInput = z.infer<typeof startCampaignRunSchema>;
