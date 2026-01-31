// ===========================================
// Core Entity Types (Matching Prisma Schema)
// ===========================================

export interface Organization {
  id: string;
  name: string;
  usageLimitLeads: number;
  usageLimitExports: number;
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string | null;
  cognitoSub: string | null;
  organizationId: string | null;
  role: UserRole;
  invitedAt: string;
  lastActiveAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type UserRole = 'readonly' | 'readwrite' | 'admin';

export interface Lead {
  id: string;
  placeId: string;
  organizationId: string;
  campaignId: string | null;
  campaignRunId: string | null;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  phone: string | null;
  website: string | null;
  rating: number | null;
  reviewCount: number | null;
  priceLevel: number | null;
  businessType: string | null;
  qualificationScore: number | null;
  qualificationNotes: string | null;
  qualifiedAt: string | null;
  source: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Campaign {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  queries: string[];
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignRun {
  id: string;
  campaignId: string;
  organizationId: string;
  startedById: string;
  status: CampaignRunStatus;
  startedAt: string;
  completedAt: string | null;
  queriesTotal: number;
  queriesExecuted: number;
  leadsFound: number;
  duplicatesSkipped: number;
  errors: number;
  errorMessages: string[];
}

export type CampaignRunStatus = 'pending' | 'running' | 'completed' | 'failed';

// ===========================================
// API Query/Response Types
// ===========================================

export interface LeadFilters {
  name?: string;
  city?: string;
  states?: string[];
  businessTypes?: string[];
  campaignId?: string;
  ratingMin?: number;
  ratingMax?: number;
  qualificationMin?: number;
  qualificationMax?: number;
  hasWebsite?: boolean;
  hasPhone?: boolean;
}

export interface LeadQueryParams {
  page: number;
  limit: number;
  sort: string;
  order: 'asc' | 'desc';
  filters: LeadFilters;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ===========================================
// Dashboard Types
// ===========================================

export interface DashboardStats {
  totalLeads: number;
  campaignsRun: number;
  qualifiedLeads: number;
  exports: number;
}

export interface TimeSeriesParams {
  startDate: string;
  endDate: string;
  granularity: 'hour' | 'day' | 'week';
}

export interface TimeSeriesData {
  timestamp: string;
  value: number;
}

export interface DistributionData {
  name: string;
  value: number;
  percentage: number;
}

// ===========================================
// Usage Types
// ===========================================

export interface UsageStats {
  leadsThisMonth: number;
  exportsThisMonth: number;
  qualificationsThisMonth: number;
  periodStart: string;
  periodEnd: string;
}

export interface UsageLimits {
  leadsPerMonth: number;
  exportsPerMonth: number;
  qualificationsPerMonth: number;
}

// ===========================================
// Input Types
// ===========================================

export interface CreateCampaignInput {
  name: string;
  description?: string;
  queries: string[];
}

export interface UpdateCampaignInput {
  name?: string;
  description?: string;
  queries?: string[];
}

export interface InviteUserInput {
  email: string;
  name?: string;
  role: UserRole;
}

// ===========================================
// Extended Types (with relations)
// ===========================================

export interface CampaignWithStats extends Campaign {
  totalLeads: number;
  lastRunAt: string | null;
  runsCount: number;
}

export interface LeadWithCampaign extends Lead {
  campaign?: Campaign;
}
