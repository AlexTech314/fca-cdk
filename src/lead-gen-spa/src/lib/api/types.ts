import type {
  Lead,
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
} from '@/types';

/**
 * LeadGenApi Interface
 * 
 * This interface defines the contract for all API operations.
 * Both mock and real implementations must follow this interface.
 * 
 * To switch from mock to real API:
 * 1. Implement this interface in client.ts
 * 2. Change the export in index.ts from mockApi to realApi
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
   * Trigger AI qualification for a lead
   */
  qualifyLead(id: string): Promise<Lead>;
  
  /**
   * Bulk qualify multiple leads
   */
  qualifyLeadsBulk(ids: string[]): Promise<Lead[]>;

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
}
