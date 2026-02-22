import { z } from 'zod';

// Lead filters (for server-side filtering)
export const leadFiltersSchema = z.object({
  name: z.string().optional(),
  cityId: z.coerce.number().int().optional(),
  stateId: z.string().optional(),
  stateIds: z.preprocess(
    (v) => (typeof v === 'string' ? v.split(',').filter(Boolean) : v),
    z.array(z.string()).optional()
  ),
  businessTypes: z.preprocess(
    (v) => (typeof v === 'string' ? v.split(',') : v),
    z.array(z.string()).optional()
  ),
  campaignId: z.string().optional(),
  ratingMin: z.coerce.number().optional(),
  ratingMax: z.coerce.number().optional(),
  qualificationMin: z.coerce.number().optional(),
  qualificationMax: z.coerce.number().optional(),
  hasWebsite: z.preprocess(
    (v) => (v === 'true' ? true : v === 'false' ? false : v),
    z.boolean().optional()
  ),
  hasPhone: z.preprocess(
    (v) => (v === 'true' ? true : v === 'false' ? false : v),
    z.boolean().optional()
  ),
  franchiseId: z.string().optional(),
});

// Lead list query params
export const leadQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(25),
  sort: z.string().default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
  // Filters are passed as individual query params
  name: z.string().optional(),
  cityId: z.coerce.number().int().optional(),
  stateId: z.string().optional(),
  stateIds: z.preprocess(
    (v) => (typeof v === 'string' ? v.split(',').filter(Boolean) : v),
    z.array(z.string()).optional()
  ),
  businessTypes: z.preprocess(
    (v) => (typeof v === 'string' ? v.split(',') : v),
    z.array(z.string()).optional()
  ),
  campaignId: z.string().optional(),
  ratingMin: z.coerce.number().optional(),
  ratingMax: z.coerce.number().optional(),
  qualificationMin: z.coerce.number().optional(),
  qualificationMax: z.coerce.number().optional(),
  hasWebsite: z.preprocess(
    (v) => (v === 'true' ? true : v === 'false' ? false : v),
    z.boolean().optional()
  ),
  hasPhone: z.preprocess(
    (v) => (v === 'true' ? true : v === 'false' ? false : v),
    z.boolean().optional()
  ),
  franchiseId: z.string().optional(),
});

// Types
export type LeadFilters = z.infer<typeof leadFiltersSchema>;
export type LeadQuery = z.infer<typeof leadQuerySchema>;
