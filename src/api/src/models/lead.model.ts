import { z } from 'zod';

const leadListFields = [
  'name',
  'city',
  'state',
  'contacts',
  'website',
  'googleMaps',
  'rating',
  'reviewCount',
  'businessType',
  'scrapedData',
  'extractedData',
  'businessQualityScore',
  'exitReadinessScore',
  'compositeScore',
  'tier',
  'webScrapedAt',
  'createdAt',
] as const;

const leadListFieldSchema = z.enum(leadListFields);

// Lead filters (for server-side filtering)
const boolPreprocess = (v: unknown) => (v === 'true' ? true : v === 'false' ? false : v);
const csvPreprocess = (v: unknown) => (typeof v === 'string' ? v.split(',').filter(Boolean) : v);

export const leadFiltersSchema = z.object({
  name: z.string().optional(),
  cityId: z.coerce.number().int().optional(),
  stateId: z.string().optional(),
  stateIds: z.preprocess(csvPreprocess, z.array(z.string()).optional()),
  businessTypes: z.preprocess(csvPreprocess, z.array(z.string()).optional()),
  campaignNames: z.preprocess(csvPreprocess, z.array(z.string()).optional()),
  searchQueryIds: z.preprocess(csvPreprocess, z.array(z.string()).optional()),
  franchiseId: z.string().optional(),
  ratingMin: z.coerce.number().optional(),
  ratingMax: z.coerce.number().optional(),
  reviewCountMin: z.coerce.number().int().optional(),
  reviewCountMax: z.coerce.number().int().optional(),
  compositeScoreMin: z.coerce.number().optional(),
  compositeScoreMax: z.coerce.number().optional(),
  bqScoreMin: z.coerce.number().int().optional(),
  bqScoreMax: z.coerce.number().int().optional(),
  erScoreMin: z.coerce.number().int().optional(),
  erScoreMax: z.coerce.number().int().optional(),
  tiers: z.preprocess(
    (v) => (typeof v === 'string' ? v.split(',').filter(Boolean).map(Number) : v),
    z.array(z.number().int()).optional()
  ),
  pipelineStatuses: z.preprocess(csvPreprocess, z.array(z.string()).optional()),
  sources: z.preprocess(csvPreprocess, z.array(z.string()).optional()),
  hasWebsite: z.preprocess(boolPreprocess, z.boolean().optional()),
  hasPhone: z.preprocess(boolPreprocess, z.boolean().optional()),
  hasContact: z.preprocess(boolPreprocess, z.boolean().optional()),
  isScored: z.preprocess(boolPreprocess, z.boolean().optional()),
  isScraped: z.preprocess(boolPreprocess, z.boolean().optional()),
  isExcluded: z.preprocess(boolPreprocess, z.boolean().optional()),
  isIntermediated: z.preprocess(boolPreprocess, z.boolean().optional()),
});

// Lead list query params
export const leadQuerySchema = leadFiltersSchema.extend({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(25),
  sort: z.string().default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
  fields: z.preprocess(csvPreprocess, z.array(leadListFieldSchema).optional()),
});

// Lead data type enum (for generic CRUD on extracted data)
export const leadDataTypes = ['contact'] as const;
export const leadDataTypeSchema = z.enum(leadDataTypes);
export type LeadDataType = z.infer<typeof leadDataTypeSchema>;

// Update schemas per data type
export const leadDataUpdateSchemas = {
  contact: z.object({
    email: z.string().optional(),
    phone: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    linkedin: z.string().optional(),
    instagram: z.string().optional(),
    facebook: z.string().optional(),
    twitter: z.string().optional(),
    isBestContact: z.boolean().optional(),
    description: z.string().optional(),
  }),
} as const;

// Types
export type LeadFilters = z.infer<typeof leadFiltersSchema>;
export type LeadQuery = z.infer<typeof leadQuerySchema>;
export type LeadListField = z.infer<typeof leadListFieldSchema>;
