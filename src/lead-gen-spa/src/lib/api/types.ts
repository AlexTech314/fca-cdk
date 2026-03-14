import type {
  Lead,
  LeadFilters,
  Franchise,
  FranchiseWithLeads,
  Campaign,
  CampaignRun,
  CampaignWithStats,
  User,
  DashboardStats,
  TimeSeriesParams,
  TimeSeriesData,
  DistributionData,
  LeadQueryParams,
  PaginatedResponse,
  CreateCampaignInput,
  UpdateCampaignInput,
  InviteUserInput,
  UsageStats,
  UsageLimits,
  LeadWithCampaign,
  FargateTask,
  FargateTaskType,
  FargateTaskStatus,
  ScrapeRun,
  LeadProvenance,
  CostSummary,
  CostRow,
  CostOverTime,
} from '@/types';

export type LeadDataType = 'email' | 'phone' | 'social';

/**
 * LeadGenApi Interface
 *
 * This interface defines the contract for all API operations.
 */
export interface LeadGenApi {
  // ===========================================
  // Dashboard
  // ===========================================
  
  /**
   * Get dashboard stats (total leads, campaigns run, etc.)
   */
  getDashboardStats(): Promise<DashboardStats>;
  
  /**
   * Get leads created over time (for line chart)
   */
  getLeadsOverTime(params: TimeSeriesParams): Promise<TimeSeriesData[]>;
  
  /**
   * Get searches queried over time (for line chart)
   */
  getSearchesOverTime(params: TimeSeriesParams): Promise<TimeSeriesData[]>;

  /**
   * Get campaign runs over time (for line chart)
   */
  getCampaignsOverTime(params: TimeSeriesParams): Promise<TimeSeriesData[]>;
  
  /**
   * Get business type distribution (for pie chart)
   */
  getBusinessTypeDistribution(): Promise<DistributionData[]>;
  
  /**
   * Get location/state distribution (for pie chart)
   */
  getLocationDistribution(): Promise<DistributionData[]>;

  /**
   * Get all states (for location filters)
   */
  getLocationsStates(): Promise<Array<{ id: string; name: string }>>;

  /**
   * Get cities for a state, ordered by population
   */
  getCitiesByState(stateId: string, limit?: number): Promise<Array<{ id: number; name: string; stateId: string }>>;

  // ===========================================
  // Leads
  // ===========================================
  
  /**
   * Get paginated leads with server-side filtering
   */
  getLeads(params: LeadQueryParams): Promise<PaginatedResponse<Lead>>;
  
  /**
   * Get a single lead by ID
   */
  getLead(id: string): Promise<LeadWithCampaign>;

  /**
   * Create a new lead with a given sortIndex
   */
  createLead(data: { name?: string; sortIndex: number }): Promise<Lead>;

  /**
   * Get the sortIndex of the adjacent lead in a given direction
   */
  getNeighborSortIndex(sortIndex: number, direction: 'above' | 'below', filters?: LeadFilters): Promise<number | null>;

  /**
   * Delete a lead by ID
   */
  deleteLead(id: string): Promise<void>;

  /**
   * Bulk delete multiple leads
   */
  deleteLeadsBulk(ids: string[]): Promise<{ deleted: number }>;

  /**
   * Update a lead (e.g. rename, change city)
   */
  updateLead(id: string, data: { name?: string; locationCityId?: number | null; locationStateId?: string | null; businessType?: string | null; phone?: string | null; sortIndex?: number | null }): Promise<Lead>;

  /**
   * Get distinct business types (skip-scan optimized)
   */
  getBusinessTypes(): Promise<string[]>;

  /**
   * Get distinct pipeline statuses present in leads
   */
  getPipelineStatuses(): Promise<string[]>;

  /**
   * Get distinct sources present in leads
   */
  getSources(): Promise<string[]>;

  /**
   * Get distinct tiers present in leads
   */
  getTiers(): Promise<number[]>;

  /**
   * Search search queries that have associated leads (paginated)
   */
  searchSearchQueries(q: string, limit?: number): Promise<Array<{ id: string; textQuery: string }>>;

  /**
   * Get search queries by IDs (for resolving labels on page load)
   */
  getSearchQueriesByIds(ids: string[]): Promise<Array<{ id: string; textQuery: string }>>;

  /**
   * Search cities by name prefix
   */
  searchCities(q: string): Promise<Array<{ id: number; name: string; state: { id: string; name: string } }>>;

  /**
   * Get count of leads matching filters
   */
  getLeadCount(params: LeadQueryParams): Promise<number>;

  /**
   * Get scrape runs for a lead (audit)
   */
  getLeadScrapeRuns(leadId: string): Promise<ScrapeRun[]>;

  /**
   * Get crawl tree for a scrape run (audit)
   */
  getScrapeRunTree(runId: string): Promise<ScrapeRun | null>;

  /**
   * Get field-level provenance for a lead (audit)
   */
  getLeadProvenance(leadId: string): Promise<LeadProvenance | null>;
  
  /**
   * Delete a scrape run by ID
   */
  deleteScrapeRun(runId: string): Promise<void>;

  /**
   * Trigger AI qualification for a lead
   */
  qualifyLead(id: string): Promise<Lead>;
  
  /**
   * Bulk qualify multiple leads
   */
  qualifyLeadsBulk(ids: string[]): Promise<{ results: Array<{ id: string; status: string; reason?: string }> }>;

  /**
   * Bulk scrape multiple leads
   */
  scrapeLeadsBulk(ids: string[]): Promise<{ results: Array<{ id: string; status: string }> }>;

  /**
   * Scrape all leads matching filters (server-side batching)
   */
  scrapeAllByFilters(filters: Record<string, unknown>): Promise<{ queued: number; skipped: number; total: number }>;

  /**
   * Qualify all leads matching filters (server-side batching)
   */
  qualifyAllByFilters(filters: Record<string, unknown>): Promise<{ queued: number; skipped: number; total: number }>;

  // ===========================================
  // Campaigns
  // ===========================================
  
  /**
   * Get all campaigns with stats
   */
  getCampaigns(): Promise<CampaignWithStats[]>;
  
  /**
   * Get a single campaign by ID
   */
  getCampaign(id: string): Promise<Campaign>;
  
  /**
   * Create a new campaign
   */
  createCampaign(data: CreateCampaignInput): Promise<Campaign>;
  
  /**
   * Update an existing campaign
   */
  updateCampaign(id: string, data: UpdateCampaignInput): Promise<Campaign>;
  
  /**
   * Delete a campaign
   */
  deleteCampaign(id: string): Promise<void>;

  // ===========================================
  // Campaign Runs
  // ===========================================
  
  /**
   * Get runs for a campaign
   */
  getCampaignRuns(campaignId: string): Promise<CampaignRun[]>;
  
  /**
   * Get a single run by ID
   */
  getCampaignRun(runId: string): Promise<CampaignRun>;
  
  /**
   * Start a new campaign run
   */
  startCampaignRun(campaignId: string): Promise<CampaignRun>;

  // ===========================================
  // Franchises
  // ===========================================

  /**
   * Get all franchises with location counts
   */
  getFranchises(): Promise<Franchise[]>;

  /**
   * Get a franchise by ID with its leads (locations)
   */
  getFranchise(id: string): Promise<FranchiseWithLeads>;

  // ===========================================
  // Users (Admin Only)
  // ===========================================
  
  /**
   * Get all users in the organization
   */
  getUsers(): Promise<User[]>;
  
  /**
   * Invite a new user to the organization
   */
  inviteUser(data: InviteUserInput): Promise<User>;
  
  /**
   * Update a user's role
   */
  updateUserRole(id: string, role: User['role']): Promise<User>;
  
  /**
   * Remove a user from the organization
   */
  removeUser(id: string): Promise<void>;

  // ===========================================
  // Usage
  // ===========================================
  
  /**
   * Get current usage stats
   */
  getUsage(): Promise<UsageStats>;
  
  /**
   * Get usage limits
   */
  getUsageLimits(): Promise<UsageLimits>;

  // ===========================================
  // Tasks
  // ===========================================

  /**
   * List Fargate tasks with optional filters
   */
  listTasks(params: { page?: number; limit?: number; type?: FargateTaskType; status?: FargateTaskStatus }): Promise<PaginatedResponse<FargateTask>>;

  /**
   * Get a single task by ID
   */
  getTask(id: string): Promise<FargateTask>;

  /**
   * Cancel a running task
   */
  cancelTask(id: string): Promise<FargateTask>;

  // ===========================================
  // Scraped Page / Lead Data CRUD
  // ===========================================

  /**
   * Get extracted facts JSON for a lead
   */
  getLeadExtractedFacts(leadId: string): Promise<Record<string, unknown>>;

  /**
   * Get combined scraped markdown for a lead
   */
  getLeadScrapedMarkdown(leadId: string): Promise<string>;

  /**
   * Get raw markdown for a scraped page
   */
  getScrapedPageMarkdown(pageId: string): Promise<string>;

  /**
   * Delete a scraped page (cascade-deletes its extracted data)
   */
  deleteScrapedPage(pageId: string): Promise<void>;

  /**
   * Create a new email for a lead
   */
  createLeadEmail(leadId: string, value: string): Promise<{ id: string; value: string }>;

  /**
   * Delete an individual extracted data item
   */
  deleteLeadData(type: LeadDataType, id: string): Promise<void>;

  /**
   * Update an individual extracted data item
   */
  updateLeadData(type: LeadDataType, id: string, data: Record<string, unknown>): Promise<unknown>;

  /**
   * Export leads to CSV: generates file on server, returns presigned download URL
   */
  exportLeads(filters: LeadFilters, columns: string[], format?: 'csv' | 'xlsx'): Promise<{ downloadUrl: string; leadCount: number; fileName: string }>;

  // ===========================================
  // Cost Management (Admin Only)
  // ===========================================

  getCostSummary(start?: string, end?: string): Promise<CostSummary>;
  getCostsByService(start?: string, end?: string): Promise<CostRow[]>;
  getCostsByResource(start?: string, end?: string, service?: string): Promise<CostRow[]>;
  getCostsOverTime(start?: string, end?: string, granularity?: 'daily' | 'monthly'): Promise<CostOverTime[]>;
  getCostsOverTimeByService(start?: string, end?: string): Promise<CostOverTime[]>;
}
