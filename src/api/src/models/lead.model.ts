import { z } from 'zod';

const leadListFields = [
  'name',
  'city',
  'state',
  'phone',
  'emails',
  'website',
  'googleMaps',
  'rating',
  'businessType',
  'qualificationScore',
  'headcountEstimate',
  'foundedYear',
  'yearsInBusiness',
  'hasAcquisitionSignal',
  'webScrapedAt',
  'createdAt',
] as const;

const leadListFieldSchema = z.enum(leadListFields);

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
  foundedYearMin: z.coerce.number().int().optional(),
  foundedYearMax: z.coerce.number().int().optional(),
  yearsInBusinessMin: z.coerce.number().int().optional(),
  yearsInBusinessMax: z.coerce.number().int().optional(),
  headcountEstimateMin: z.coerce.number().int().optional(),
  headcountEstimateMax: z.coerce.number().int().optional(),
  hasAcquisitionSignal: z.preprocess(
    (v) => (v === 'true' ? true : v === 'false' ? false : v),
    z.boolean().optional()
  ),
  hasExtractedEmail: z.preprocess(
    (v) => (v === 'true' ? true : v === 'false' ? false : v),
    z.boolean().optional()
  ),
  hasExtractedPhone: z.preprocess(
    (v) => (v === 'true' ? true : v === 'false' ? false : v),
    z.boolean().optional()
  ),
});

// Lead list query params
export const leadQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(25),
  sort: z.string().default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
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
  foundedYearMin: z.coerce.number().int().optional(),
  foundedYearMax: z.coerce.number().int().optional(),
  yearsInBusinessMin: z.coerce.number().int().optional(),
  yearsInBusinessMax: z.coerce.number().int().optional(),
  headcountEstimateMin: z.coerce.number().int().optional(),
  headcountEstimateMax: z.coerce.number().int().optional(),
  hasAcquisitionSignal: z.preprocess(
    (v) => (v === 'true' ? true : v === 'false' ? false : v),
    z.boolean().optional()
  ),
  hasExtractedEmail: z.preprocess(
    (v) => (v === 'true' ? true : v === 'false' ? false : v),
    z.boolean().optional()
  ),
  hasExtractedPhone: z.preprocess(
    (v) => (v === 'true' ? true : v === 'false' ? false : v),
    z.boolean().optional()
  ),
  fields: z.preprocess(
    (v) => (typeof v === 'string' ? v.split(',').filter(Boolean) : v),
    z.array(leadListFieldSchema).optional()
  ),
});

// Lead data type enum (for generic CRUD on extracted data)
export const leadDataTypes = ['email', 'phone', 'social', 'team', 'acquisition', 'snippet'] as const;
export const leadDataTypeSchema = z.enum(leadDataTypes);
export type LeadDataType = z.infer<typeof leadDataTypeSchema>;

// Update schemas per data type
export const leadDataUpdateSchemas = {
  email: z.object({ value: z.string().min(1) }),
  phone: z.object({ value: z.string().min(1) }),
  social: z.object({ platform: z.string().min(1), url: z.string().min(1) }),
  team: z.object({ name: z.string().min(1), title: z.string().nullable().optional() }),
  acquisition: z.object({ text: z.string().min(1) }),
  snippet: z.object({ text: z.string().min(1) }),
} as const;

// Types
export type LeadFilters = z.infer<typeof leadFiltersSchema>;
export type LeadQuery = z.infer<typeof leadQuerySchema>;
export type LeadListField = z.infer<typeof leadListFieldSchema>;
