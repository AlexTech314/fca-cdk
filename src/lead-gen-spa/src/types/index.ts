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
  role: UserRole;
  invitedAt: string;
  lastActiveAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type UserRole = 'readonly' | 'readwrite' | 'admin';

export type LeadPipelineStatus = 'idle' | 'queued_for_scrape' | 'scraping' | 'queued_for_scoring' | 'queued_for_batch_scoring' | 'scoring';

export interface Franchise {
  id: string;
  name: string;
  displayName: string | null;
  locationCount?: number;
}

export interface FranchiseWithLeads extends Franchise {
  leads: Lead[];
}

export interface LocationCity {
  id: number;
  name: string;
}

export interface LocationState {
  id: string;
  name: string;
}

export interface Lead {
  id: string;
  placeId: string;
  campaignId: string | null;
  campaignRunId: string | null;
  name: string;
  address: string | null;
  /** Display string from locationCity?.name (for backward compatibility) */
  city: string | null;
  /** Display string from locationState?.name or id (for backward compatibility) */
  state: string | null;
  locationCity?: LocationCity | null;
  locationState?: LocationState | null;
  zipCode: string | null;
  phone: string | null;
  website: string | null;
  googleMapsUri?: string | null;
  editorialSummary?: string | null;
  reviewSummary?: string | null;
  rating: number | null;
  reviewCount: number | null;
  priceLevel: number | null;
  businessType: string | null;
  priorityScore: number | null;
  priorityTier: number | null;
  scoringRationale: string | null;
  scoredAt: string | null;
  isExcluded: boolean;
  source: 'google_places' | 'manual' | 'import' | null;
  franchiseId: string | null;
  franchise?: Franchise | null;
  campaign?: { id: string; name: string } | null;
  /** Emails from leadEmails (for list display) */
  emails?: string[];
  contactPageUrl?: string | null;
  pipelineStatus: LeadPipelineStatus;
  webScrapedAt?: string | null;
  /** Pages scraped in most recent run (from list API) */
  lastScrapePagesCount?: number | null;
  createdAt: string;
  updatedAt: string;
}

/** Extracted value with provenance */
export interface LeadEmail {
  id: string;
  value: string;
  sourcePageId: string;
  sourceRunId: string;
  sourcePage?: { id: string; url: string } | null;
}

export interface LeadPhone {
  id: string;
  value: string;
  sourcePageId: string;
  sourceRunId: string;
  sourcePage?: { id: string; url: string } | null;
}

export interface LeadSocialProfile {
  id: string;
  platform: string;
  url: string;
  sourcePageId: string;
  sourceRunId: string;
  sourcePage?: { id: string; url: string } | null;
}

export interface ScrapedPageRef {
  id: string;
  url: string;
  parentScrapedPageId?: string | null;
  depth?: number;
  scrapedAt?: string;
  statusCode?: number;
  scrapeMethod?: string;
  parentScrapedPage?: { id: string; url: string } | null;
}

export interface ScrapeRun {
  id: string;
  leadId: string;
  rootUrl: string;
  status: 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt: string | null;
  methodSummary: string | null;
  pagesCount?: number | null;
  durationMs?: number | null;
  scrapedPages: ScrapedPageRef[];
}

export interface LeadProvenance {
  emails: Array<{ value: string; sourcePageId: string; sourceRunId: string; sourcePage: { id: string; url: string } | null }>;
  phones: Array<{ value: string; sourcePageId: string; sourceRunId: string; sourcePage: { id: string; url: string } | null }>;
  socialProfiles: Array<{ platform: string; url: string; sourcePageId: string; sourceRunId: string; sourcePage: { id: string; url: string } | null }>;
}

export interface Campaign {
  id: string;
  name: string;
  description: string | null;
  queries: string[];
  maxResultsPerSearch?: number;
  maxTotalRequests?: number | null;
  enableWebScraping?: boolean;
  enableAiScoring?: boolean;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignRun {
  id: string;
  campaignId: string;
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

export type FargateTaskType = 'places_search' | 'web_scrape' | 'ai_scoring';
export type FargateTaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface FargateTask {
  id: string;
  type: FargateTaskType;
  status: FargateTaskStatus;
  taskArn: string | null;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

// ===========================================
// API Query/Response Types
// ===========================================

export interface LeadFilters {
  name?: string;
  cityId?: number;
  stateIds?: string[];
  businessTypes?: string[];
  campaignId?: string;
  franchiseId?: string;
  ratingMin?: number;
  ratingMax?: number;
  qualificationMin?: number;
  qualificationMax?: number;
  hasWebsite?: boolean;
  hasPhone?: boolean;
  hasExtractedEmail?: boolean;
  hasExtractedPhone?: boolean;
}

export interface LeadQueryParams {
  page: number;
  limit: number;
  sort: string;
  order: 'asc' | 'desc';
  filters: LeadFilters;
  fields?: LeadListField[];
}

export type LeadListField =
  | 'name'
  | 'city'
  | 'state'
  | 'phone'
  | 'emails'
  | 'website'
  | 'googleMaps'
  | 'rating'
  | 'businessType'
  | 'priorityScore'
  | 'priorityTier'
  | 'webScrapedAt'
  | 'createdAt';

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
  maxResultsPerSearch?: number;
  maxTotalRequests?: number;
  enableWebScraping?: boolean;
  enableAiScoring?: boolean;
}

export interface UpdateCampaignInput {
  name?: string;
  description?: string;
  queries?: string[];
  maxResultsPerSearch?: number;
  maxTotalRequests?: number;
  enableWebScraping?: boolean;
  enableAiScoring?: boolean;
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
  leadEmails?: LeadEmail[];
  leadPhones?: LeadPhone[];
  leadSocialProfiles?: LeadSocialProfile[];
  scrapeRuns?: ScrapeRun[];
}
