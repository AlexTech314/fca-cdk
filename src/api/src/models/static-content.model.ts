import { z } from 'zod';

// ============================================
// TEAM MEMBER
// ============================================

export const createTeamMemberSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  title: z.string().min(1, 'Title is required'),
  image: z.string().optional().nullable(),
  bio: z.string().min(1, 'Bio is required'),
  email: z.string().email().optional().nullable(),
  linkedIn: z.string().url().optional().nullable(),
  category: z.enum(['leadership', 'analyst']).default('leadership'),
  sortOrder: z.number().int().default(0),
  isPublished: z.boolean().default(true),
});

export const updateTeamMemberSchema = createTeamMemberSchema.partial();

export const teamMemberQuerySchema = z.object({
  category: z.string().optional(),
  published: z.coerce.boolean().optional(),
});

export type CreateTeamMemberInput = z.infer<typeof createTeamMemberSchema>;
export type UpdateTeamMemberInput = z.infer<typeof updateTeamMemberSchema>;
export type TeamMemberQuery = z.infer<typeof teamMemberQuerySchema>;

// ============================================
// COMMUNITY SERVICE
// ============================================

export const createCommunityServiceSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().min(1, 'Description is required'),
  url: z.string().url('Invalid URL'),
  sortOrder: z.number().int().default(0),
  isPublished: z.boolean().default(true),
});

export const updateCommunityServiceSchema = createCommunityServiceSchema.partial();

export type CreateCommunityServiceInput = z.infer<typeof createCommunityServiceSchema>;
export type UpdateCommunityServiceInput = z.infer<typeof updateCommunityServiceSchema>;

// ============================================
// FAQ
// ============================================

export const createFAQSchema = z.object({
  question: z.string().min(1, 'Question is required'),
  answer: z.string().min(1, 'Answer is required'),
  sortOrder: z.number().int().default(0),
  isPublished: z.boolean().default(true),
});

export const updateFAQSchema = createFAQSchema.partial();

export type CreateFAQInput = z.infer<typeof createFAQSchema>;
export type UpdateFAQInput = z.infer<typeof updateFAQSchema>;

// ============================================
// CORE VALUE
// ============================================

export const createCoreValueSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  icon: z.string().min(1, 'Icon is required'),
  sortOrder: z.number().int().default(0),
  isPublished: z.boolean().default(true),
});

export const updateCoreValueSchema = createCoreValueSchema.partial();

export type CreateCoreValueInput = z.infer<typeof createCoreValueSchema>;
export type UpdateCoreValueInput = z.infer<typeof updateCoreValueSchema>;

// ============================================
// INDUSTRY SECTOR
// ============================================

export const createIndustrySectorSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().min(1, 'Description is required'),
  sortOrder: z.number().int().default(0),
  isPublished: z.boolean().default(true),
});

export const updateIndustrySectorSchema = createIndustrySectorSchema.partial();

export type CreateIndustrySectorInput = z.infer<typeof createIndustrySectorSchema>;
export type UpdateIndustrySectorInput = z.infer<typeof updateIndustrySectorSchema>;

// ============================================
// SERVICE OFFERING
// ============================================

export const createServiceOfferingSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional().nullable(),
  category: z.enum(['sell-side', 'buy-side', 'strategic']),
  type: z.enum(['service', 'process-step', 'benefit', 'disadvantage']).default('service'),
  step: z.number().int().optional().nullable(),
  sortOrder: z.number().int().default(0),
  isPublished: z.boolean().default(true),
});

export const updateServiceOfferingSchema = createServiceOfferingSchema.partial();

export const serviceOfferingQuerySchema = z.object({
  category: z.string().optional(),
  type: z.string().optional(),
  published: z.coerce.boolean().optional(),
});

export type CreateServiceOfferingInput = z.infer<typeof createServiceOfferingSchema>;
export type UpdateServiceOfferingInput = z.infer<typeof updateServiceOfferingSchema>;
export type ServiceOfferingQuery = z.infer<typeof serviceOfferingQuerySchema>;

// ============================================
// REORDER
// ============================================

export const reorderSchema = z.object({
  items: z.array(z.object({
    id: z.string(),
    sortOrder: z.number().int(),
  })),
});

export type ReorderInput = z.infer<typeof reorderSchema>;
