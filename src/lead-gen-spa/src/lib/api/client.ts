/**
 * Real API Client
 *
 * Implements the LeadGenApi interface with real HTTP calls to the Express API.
 * Backend uses snake_case; frontend uses camelCase. Transforms happen here.
 */

import type { LeadGenApi, LeadDataType } from './types';
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
  CostSummary,
  CostRow,
  CostOverTime,
} from '@/types';
import { getIdToken } from '../auth';
import { API_BASE_URL, ADMIN_API_BASE_URL } from '../amplify-config';

// ============================================
// HTTP Client Helper
// ============================================

async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Always send auth token (all leadgen routes require auth)
  const token = await getIdToken();
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || error.message || 'API request failed');
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as unknown as T;
  }

  return response.json();
}

/** Admin API client — same as apiClient but uses ADMIN_API_BASE_URL */
async function adminApiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const token = await getIdToken();
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${ADMIN_API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || error.message || 'API request failed');
  }

  if (response.status === 204) {
    return undefined as unknown as T;
  }

  return response.json();
}

// ============================================
// Transform Helpers (snake_case -> camelCase)
// ============================================

/** Extract .text from a Google Places JSON-encoded summary field, or return the plain string. */
function extractJsonText(val: unknown): string | null {
  if (val == null) return null;
  if (typeof val === 'object') return (val as any).text ?? null;
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      return parsed.text ?? val;
    } catch {
      return val;
    }
  }
  return null;
}

function transformFranchise(raw: any): Franchise {
  return {
    id: raw.id,
    name: raw.name,
    displayName: raw.displayName ?? raw.display_name ?? null,
    locationCount: raw.locationCount ?? raw.location_count,
  };
}

function transformLead(raw: any): Lead {
  const locationCity = raw.locationCity ?? raw.location_city;
  const locationState = raw.locationState ?? raw.location_state;
  const placeId = raw.placeId || raw.place_id;
  const googleMapsUri =
    raw.googleMapsUri ||
    raw.google_maps_uri ||
    (placeId && !placeId.startsWith('manual_') ? `https://www.google.com/maps/place/?q=place_id:${placeId}` : null);
  return {
    id: raw.id,
    placeId,
    campaignId: raw.campaignId || raw.campaign_id || null,
    campaignRunId: raw.campaignRunId || raw.campaign_run_id || null,
    name: raw.name,
    address: raw.address || null,
    city: locationCity?.name ?? raw.city ?? null,
    state: locationState?.name ?? locationState?.id ?? raw.state ?? null,
    locationCity: locationCity ? { id: locationCity.id, name: locationCity.name } : null,
    locationState: locationState ? { id: locationState.id, name: locationState.name } : null,
    zipCode: raw.zipCode || raw.zip_code || null,
    phone: raw.phone || null,
    website: raw.website || null,
    googleMapsUri,
    rating: raw.rating ?? null,
    reviewCount: raw.reviewCount ?? raw.review_count ?? null,
    priceLevel: raw.priceLevel ?? raw.price_level ?? null,
    businessType: raw.businessType || raw.business_type || null,
    businessQualityScore: raw.businessQualityScore ?? raw.business_quality_score ?? null,
    exitReadinessScore: raw.exitReadinessScore ?? raw.exit_readiness_score ?? null,
    controllingOwner: raw.controllingOwner ?? raw.controlling_owner ?? null,
    ownershipType: raw.ownershipType ?? raw.ownership_type ?? null,
    scoringRationale: raw.scoringRationale || raw.scoring_rationale || null,
    supportingEvidence: raw.supportingEvidence ?? raw.supporting_evidence ?? [],
    scoredAt: raw.scoredAt || raw.scored_at || null,
    compositeScore: raw.compositeScore ?? raw.composite_score ?? null,
    tier: raw.tier ?? null,
    isIntermediated: raw.isIntermediated ?? raw.is_intermediated ?? false,
    intermediationSignals: raw.intermediationSignals ?? raw.intermediation_signals ?? null,
    isExcluded: raw.isExcluded ?? raw.is_excluded ?? false,
    exclusionReason: raw.exclusionReason ?? raw.exclusion_reason ?? null,
    source: raw.source || null,
    franchiseId: raw.franchiseId ?? raw.franchise_id ?? null,
    franchise: raw.franchise ? transformFranchise(raw.franchise) : null,
    campaign: raw.campaign ? { id: raw.campaign.id, name: raw.campaign.name } : null,
    editorialSummary: extractJsonText(raw.editorialSummary ?? raw.editorial_summary),
    reviewSummary: extractJsonText(raw.reviewSummary ?? raw.review_summary),
    contactPageUrl: raw.contactPageUrl ?? raw.contact_page_url ?? null,
    sortIndex: raw.sortIndex ?? raw.sort_index ?? null,
    pipelineStatus: raw.pipelineStatus ?? raw.pipeline_status ?? 'idle',
    scrapeError: raw.scrapeError ?? raw.scrape_error ?? null,
    scoringError: raw.scoringError ?? raw.scoring_error ?? null,
    webScrapedAt: raw.webScrapedAt ?? raw.web_scraped_at ?? null,
    lastScrapePagesCount: raw.scrapeRuns?.[0]?.pagesCount ?? null,
    leadContacts: raw.leadContacts ?? [],
    createdAt: raw.createdAt || raw.created_at,
    updatedAt: raw.updatedAt || raw.updated_at,
  };
}

function transformCampaign(raw: any): Campaign {
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description || null,
    queries: (raw.searches || raw.queries || []).map((q: any) => typeof q === 'string' ? q : q.textQuery ?? q),
    maxResultsPerSearch: raw.maxResultsPerSearch ?? raw.max_results_per_search ?? 60,
    maxTotalRequests: raw.maxTotalRequests ?? raw.max_total_requests ?? null,
    enableWebScraping: raw.enableWebScraping ?? raw.enable_web_scraping ?? true,
    enableAiScoring: raw.enableAiScoring ?? raw.enable_ai_scoring ?? false,
    enableContactExtraction: raw.enableContactExtraction ?? raw.enable_contact_extraction ?? false,
    createdById: raw.createdById || raw.created_by_id || '',
    createdAt: raw.createdAt || raw.created_at,
    updatedAt: raw.updatedAt || raw.updated_at,
  };
}

function transformCampaignWithStats(raw: any): CampaignWithStats {
  return {
    ...transformCampaign(raw),
    totalLeads: raw.totalLeads ?? raw.total_leads ?? 0,
    lastRunAt: raw.lastRunAt || raw.last_run_at || null,
    runsCount: raw.runsCount ?? raw.runs_count ?? 0,
  };
}

function transformCampaignRun(raw: any): CampaignRun {
  return {
    id: raw.id,
    campaignId: raw.campaignId || raw.campaign_id,
    startedById: raw.startedById || raw.started_by_id || '',
    status: raw.status,
    startedAt: raw.startedAt || raw.started_at,
    completedAt: raw.completedAt || raw.completed_at || null,
    queriesTotal: raw.queriesTotal ?? raw.queries_total ?? 0,
    queriesExecuted: raw.queriesExecuted ?? raw.queries_executed ?? 0,
    leadsFound: raw.leadsFound ?? raw.leads_found ?? 0,
    duplicatesSkipped: raw.duplicatesSkipped ?? raw.duplicates_skipped ?? 0,
    errors: raw.errors ?? 0,
    errorMessages: raw.errorMessages || raw.error_messages || [],
  };
}

function transformFargateTask(raw: any): FargateTask {
  return {
    id: raw.id,
    type: raw.type,
    status: raw.status,
    taskArn: raw.taskArn ?? raw.task_arn ?? null,
    startedAt: raw.startedAt ?? raw.started_at ?? null,
    completedAt: raw.completedAt ?? raw.completed_at ?? null,
    errorMessage: raw.errorMessage ?? raw.error_message ?? null,
    metadata: raw.metadata ?? null,
    createdAt: raw.createdAt ?? raw.created_at,
    updatedAt: raw.updatedAt ?? raw.updated_at,
  };
}

function transformUser(raw: any): User {
  return {
    id: raw.id,
    email: raw.email,
    cognitoSub: raw.cognitoSub || raw.cognito_sub || null,
    role: raw.role,
    createdAt: raw.createdAt || raw.created_at,
    updatedAt: raw.updatedAt || raw.updated_at,
  };
}

// ============================================
// Real API Implementation
// ============================================

export const realApi: LeadGenApi = {
  // ===========================================
  // Dashboard
  // ===========================================

  async getDashboardStats(): Promise<DashboardStats> {
    return apiClient<DashboardStats>('/dashboard/stats');
  },

  async getLeadsOverTime(params: TimeSeriesParams): Promise<TimeSeriesData[]> {
    const qs = new URLSearchParams({
      startDate: params.startDate,
      endDate: params.endDate,
      granularity: params.granularity,
    });
    return apiClient<TimeSeriesData[]>(`/dashboard/leads-over-time?${qs}`);
  },

  async getSearchesOverTime(params: TimeSeriesParams): Promise<TimeSeriesData[]> {
    const qs = new URLSearchParams({
      startDate: params.startDate,
      endDate: params.endDate,
      granularity: params.granularity,
    });
    return apiClient<TimeSeriesData[]>(`/dashboard/searches-over-time?${qs}`);
  },

  async getCampaignsOverTime(params: TimeSeriesParams): Promise<TimeSeriesData[]> {
    const qs = new URLSearchParams({
      startDate: params.startDate,
      endDate: params.endDate,
    });
    return apiClient<TimeSeriesData[]>(`/dashboard/campaigns-over-time?${qs}`);
  },

  async getBusinessTypeDistribution(): Promise<DistributionData[]> {
    return apiClient<DistributionData[]>('/dashboard/business-type-distribution');
  },

  async getLocationDistribution(): Promise<DistributionData[]> {
    return apiClient<DistributionData[]>('/dashboard/location-distribution');
  },

  async getLocationsStates(): Promise<Array<{ id: string; name: string }>> {
    const states = await apiClient<Array<{ id: string; name: string }>>('/locations/states');
    return states.map((s) => ({ id: s.id, name: s.name }));
  },

  async getCitiesByState(stateId: string, limit?: number): Promise<Array<{ id: number; name: string; stateId: string }>> {
    const qs = limit ? `?limit=${limit}` : '';
    return apiClient<Array<{ id: number; name: string; stateId: string }>>(`/locations/states/${stateId}/cities${qs}`);
  },

  async getBusinessTypes(): Promise<string[]> {
    return apiClient<string[]>('/leads/business-types');
  },

  async getPipelineStatuses(): Promise<string[]> {
    return apiClient<string[]>('/leads/pipeline-statuses');
  },

  async getSources(): Promise<string[]> {
    return apiClient<string[]>('/leads/sources');
  },

  async getTiers(): Promise<number[]> {
    return apiClient<number[]>('/leads/tiers');
  },

  async searchSearchQueries(q: string, limit = 20): Promise<Array<{ id: string; textQuery: string }>> {
    const qs = new URLSearchParams({ q, limit: String(limit) });
    return apiClient<Array<{ id: string; textQuery: string }>>(`/leads/search-queries?${qs}`);
  },

  async getSearchQueriesByIds(ids: string[]): Promise<Array<{ id: string; textQuery: string }>> {
    if (ids.length === 0) return [];
    const qs = new URLSearchParams({ ids: ids.join(',') });
    return apiClient<Array<{ id: string; textQuery: string }>>(`/leads/search-queries?${qs}`);
  },

  async searchCities(q: string): Promise<Array<{ id: number; name: string; state: { id: string; name: string } }>> {
    if (!q.trim()) return [];
    const qs = new URLSearchParams({ q, type: 'city', limit: '15' });
    const result = await apiClient<{ cities: Array<{ id: number; name: string; state: { id: string; name: string } }> }>(
      `/locations/search?${qs}`
    );
    return result.cities ?? [];
  },

  // ===========================================
  // Leads
  // ===========================================

  async getLeads(params: LeadQueryParams): Promise<PaginatedResponse<Lead>> {
    const qs = new URLSearchParams();
    qs.set('page', String(params.page));
    qs.set('limit', String(params.limit));
    qs.set('sort', params.sort);
    qs.set('order', params.order);
    if (params.fields?.length) qs.set('fields', params.fields.join(','));

    for (const [k, v] of Object.entries(params.filters)) {
      if (v === undefined || v === null || v === '') continue;
      if (Array.isArray(v)) { if (v.length > 0) qs.set(k, v.join(',')); }
      else qs.set(k, String(v));
    }

    const result = await apiClient<{ data: any[]; total: number; page: number; limit: number; totalPages: number }>(
      `/leads?${qs}`
    );

    return {
      data: result.data.map(transformLead),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  },

  async deleteLead(id: string): Promise<void> {
    await apiClient(`/leads/${id}`, { method: 'DELETE' });
  },

  async deleteLeadsBulk(ids: string[]): Promise<{ deleted: number }> {
    return apiClient<{ deleted: number }>('/leads/delete-bulk', {
      method: 'POST',
      body: JSON.stringify({ leadIds: ids }),
    });
  },

  async updateLead(id: string, data: { name?: string; locationCityId?: number | null; locationStateId?: string | null; businessType?: string | null; phone?: string | null; sortIndex?: number | null }): Promise<Lead> {
    const raw = await apiClient<any>(`/leads/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return transformLead(raw);
  },

  async createLead(data: { name?: string; sortIndex: number }): Promise<Lead> {
    const raw = await apiClient<any>('/leads', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return transformLead(raw);
  },

  async getNeighborSortIndex(sortIndex: number, direction: 'above' | 'below', filters?: LeadFilters): Promise<number | null> {
    const qs = new URLSearchParams();
    qs.set('sortIndex', String(sortIndex));
    qs.set('direction', direction);
    if (filters) {
      for (const [k, v] of Object.entries(filters)) {
        if (v === undefined || v === null || v === '') continue;
        if (Array.isArray(v)) { if (v.length > 0) qs.set(k, v.join(',')); }
        else qs.set(k, String(v));
      }
    }
    const result = await apiClient<{ sortIndex: number | null }>(`/leads/neighbor?${qs}`);
    return result.sortIndex;
  },

  async getLead(id: string): Promise<LeadWithCampaign> {
    const raw = await apiClient<any>(`/leads/${id}`);
    const lead = transformLead(raw) as LeadWithCampaign;
    lead.leadContacts = raw.leadContacts ?? [];
    lead.scrapeRuns = raw.scrapeRuns ?? [];
    return lead;
  },

  async getLeadScrapeRuns(leadId: string) {
    return apiClient<any[]>(`/leads/${leadId}/scrape-runs`);
  },

  async getScrapeRunTree(runId: string) {
    return apiClient<any>(`/scrape-runs/${runId}/tree`);
  },

  async getLeadProvenance(leadId: string) {
    return apiClient<any>(`/leads/${leadId}/provenance`);
  },

  async deleteScrapeRun(runId: string): Promise<void> {
    await apiClient(`/scrape-runs/${runId}`, { method: 'DELETE' });
  },

  async getLeadCount(params: LeadQueryParams): Promise<number> {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params.filters)) {
      if (v === undefined || v === null || v === '') continue;
      if (Array.isArray(v)) { if (v.length > 0) qs.set(k, v.join(',')); }
      else qs.set(k, String(v));
    }

    const result = await apiClient<{ count: number }>(`/leads/count?${qs}`);
    return result.count;
  },

  async qualifyLead(id: string): Promise<Lead> {
    const raw = await apiClient<any>(`/leads/${id}/qualify`, { method: 'POST' });
    return transformLead(raw);
  },

  async qualifyLeadsBulk(ids: string[]): Promise<{ results: Array<{ id: string; status: string; reason?: string }> }> {
    return apiClient<{ results: Array<{ id: string; status: string; reason?: string }> }>('/leads/qualify-bulk', {
      method: 'POST',
      body: JSON.stringify({ leadIds: ids }),
    });
  },

  async scrapeLeadsBulk(ids: string[]): Promise<{ results: Array<{ id: string; status: string }> }> {
    return apiClient<{ results: Array<{ id: string; status: string }> }>('/leads/scrape-bulk', {
      method: 'POST',
      body: JSON.stringify({ leadIds: ids }),
    });
  },

  async scrapeAllByFilters(filters: Record<string, unknown>): Promise<{ queued: number; skipped: number; total: number }> {
    return apiClient<{ queued: number; skipped: number; total: number }>('/leads/scrape-all', {
      method: 'POST',
      body: JSON.stringify(filters),
    });
  },

  async qualifyAllByFilters(filters: Record<string, unknown>): Promise<{ queued: number; skipped: number; total: number }> {
    return apiClient<{ queued: number; skipped: number; total: number }>('/leads/qualify-all', {
      method: 'POST',
      body: JSON.stringify(filters),
    });
  },

  async extractContactsBulk(ids: string[]): Promise<{ results: Array<{ id: string; status: string }> }> {
    return apiClient<{ results: Array<{ id: string; status: string }> }>('/leads/extract-contacts-bulk', {
      method: 'POST',
      body: JSON.stringify({ leadIds: ids }),
    });
  },

  async extractContactsAllByFilters(filters: Record<string, unknown>): Promise<{ queued: number; skipped: number; total: number }> {
    return apiClient<{ queued: number; skipped: number; total: number }>('/leads/extract-contacts-all', {
      method: 'POST',
      body: JSON.stringify(filters),
    });
  },

  // ===========================================
  // Campaigns
  // ===========================================

  async searchCampaigns(q: string, limit = 20): Promise<Array<{ id: string; name: string }>> {
    const qs = new URLSearchParams({ q, limit: String(limit) });
    return apiClient<Array<{ id: string; name: string }>>(`/campaigns/search?${qs}`);
  },

  async getCampaignsByIds(ids: string[]): Promise<Array<{ id: string; name: string }>> {
    if (ids.length === 0) return [];
    const qs = new URLSearchParams({ ids: ids.join(',') });
    return apiClient<Array<{ id: string; name: string }>>(`/campaigns/search?${qs}`);
  },

  async getCampaigns(): Promise<CampaignWithStats[]> {
    const raw = await apiClient<any[]>('/campaigns');
    return raw.map(transformCampaignWithStats);
  },

  async getCampaign(id: string): Promise<Campaign> {
    const raw = await apiClient<any>(`/campaigns/${id}`);
    return transformCampaign(raw);
  },

  async createCampaign(data: CreateCampaignInput): Promise<Campaign> {
    const result = await apiClient<{ campaign: any; uploadUrl: string }>('/campaigns', {
      method: 'POST',
      body: JSON.stringify({
        name: data.name,
        description: data.description,
        maxResultsPerSearch: data.maxResultsPerSearch,
        maxTotalRequests: data.maxTotalRequests,
        enableWebScraping: data.enableWebScraping,
        enableAiScoring: data.enableAiScoring,
        enableContactExtraction: data.enableContactExtraction,
      }),
    });

    // Upload queries to S3 via presigned URL
    if (data.queries.length > 0 && result.uploadUrl) {
      try {
        const payload = {
          searches: data.queries.map((q) => ({ textQuery: q })),
          count: data.queries.length,
          uploadedAt: new Date().toISOString(),
        };

        const uploadRes = await fetch(result.uploadUrl, {
          method: 'PUT',
          body: JSON.stringify(payload),
          headers: { 'Content-Type': 'application/json' },
        });

        if (!uploadRes.ok) {
          throw new Error(`S3 upload failed: ${uploadRes.status} ${uploadRes.statusText}`);
        }

        // Confirm upload
        await apiClient(`/campaigns/${result.campaign.id}/confirm-upload`, {
          method: 'POST',
          body: JSON.stringify({ searchesCount: data.queries.length }),
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Upload failed';
        throw new Error(`Campaign created but queries upload failed. Please edit the campaign and retry. ${msg}`);
      }
    }

    return transformCampaign(result.campaign);
  },

  async updateCampaign(id: string, data: UpdateCampaignInput): Promise<Campaign> {
    const hasNewQueries = data.queries && data.queries.length > 0;
    const result = await apiClient<{ campaign: any; uploadUrl?: string }>(`/campaigns/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        name: data.name,
        description: data.description,
        maxResultsPerSearch: data.maxResultsPerSearch,
        maxTotalRequests: data.maxTotalRequests,
        enableWebScraping: data.enableWebScraping,
        enableAiScoring: data.enableAiScoring,
        enableContactExtraction: data.enableContactExtraction,
        updateSearches: hasNewQueries,
      }),
    });

    // Upload new queries if provided
    if (hasNewQueries && result.uploadUrl) {
      try {
        const payload = {
          searches: data.queries!.map((q) => ({ textQuery: q })),
          count: data.queries!.length,
          uploadedAt: new Date().toISOString(),
        };

        const uploadRes = await fetch(result.uploadUrl, {
          method: 'PUT',
          body: JSON.stringify(payload),
          headers: { 'Content-Type': 'application/json' },
        });

        if (!uploadRes.ok) {
          throw new Error(`S3 upload failed: ${uploadRes.status} ${uploadRes.statusText}`);
        }

        await apiClient(`/campaigns/${result.campaign.id}/confirm-upload`, {
          method: 'POST',
          body: JSON.stringify({ searchesCount: data.queries!.length }),
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Upload failed';
        throw new Error(`Campaign updated but queries upload failed. Please retry. ${msg}`);
      }
    }

    return transformCampaign(result.campaign);
  },

  async deleteCampaign(id: string): Promise<void> {
    await apiClient(`/campaigns/${id}`, { method: 'DELETE' });
  },

  // ===========================================
  // Campaign Runs
  // ===========================================

  async getCampaignRuns(campaignId: string): Promise<CampaignRun[]> {
    const raw = await apiClient<any[]>(`/campaigns/${campaignId}/runs`);
    return raw.map(transformCampaignRun);
  },

  async getCampaignRun(runId: string): Promise<CampaignRun> {
    const raw = await apiClient<any>(`/runs/${runId}`);
    return transformCampaignRun(raw);
  },

  async startCampaignRun(campaignId: string): Promise<CampaignRun> {
    const raw = await apiClient<any>(`/campaigns/${campaignId}/run`, { method: 'POST' });
    return transformCampaignRun(raw);
  },

  // ===========================================
  // Franchises
  // ===========================================

  async getFranchises(): Promise<Franchise[]> {
    const raw = await apiClient<any[]>('/franchises');
    return raw.map(transformFranchise);
  },

  async getFranchise(id: string): Promise<FranchiseWithLeads> {
    const raw = await apiClient<any>(`/franchises/${id}`);
    return {
      ...transformFranchise(raw),
      locationCount: raw.leads?.length ?? raw.locationCount ?? raw.location_count,
      leads: (raw.leads || []).map(transformLead),
    };
  },

  // ===========================================
  // Users
  // ===========================================

  async getUsers(): Promise<User[]> {
    const result = await adminApiClient<any>('/users');
    const items = result.items || result.data || result;
    return (Array.isArray(items) ? items : []).map(transformUser);
  },

  async inviteUser(data: InviteUserInput): Promise<User> {
    const raw = await adminApiClient<any>('/users/invite', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return transformUser(raw);
  },

  async updateUserRole(id: string, role: User['role']): Promise<User> {
    const raw = await adminApiClient<any>(`/users/${id}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
    return transformUser(raw);
  },

  async removeUser(id: string): Promise<void> {
    await adminApiClient(`/users/${id}`, { method: 'DELETE' });
  },

  // ===========================================
  // Usage
  // ===========================================

  async getUsage(): Promise<UsageStats> {
    return apiClient<UsageStats>('/usage');
  },

  async getUsageLimits(): Promise<UsageLimits> {
    return apiClient<UsageLimits>('/usage/limits');
  },

  // ===========================================
  // Tasks
  // ===========================================

  async listTasks(params: { page?: number; limit?: number; type?: FargateTaskType; status?: FargateTaskStatus }): Promise<PaginatedResponse<FargateTask>> {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));
    if (params.type) qs.set('type', params.type);
    if (params.status) qs.set('status', params.status);
    const result = await apiClient<{ data: any[]; total: number; page: number; limit: number; totalPages: number }>(
      `/tasks?${qs}`
    );
    return {
      data: result.data.map(transformFargateTask),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  },

  async getTask(id: string): Promise<FargateTask> {
    const raw = await apiClient<any>(`/tasks/${id}`);
    return transformFargateTask(raw);
  },

  async cancelTask(id: string): Promise<FargateTask> {
    const raw = await apiClient<any>(`/tasks/${id}/cancel`, { method: 'POST' });
    return transformFargateTask(raw);
  },

  // ===========================================
  // Scraped Page / Lead Data CRUD
  // ===========================================

  async getLeadExtractedFacts(leadId: string): Promise<Record<string, unknown>> {
    const token = await getIdToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const response = await fetch(`${API_BASE_URL}/leads/${leadId}/extracted-facts`, { headers });
    if (!response.ok) {
      throw new Error(response.status === 404 ? 'Extracted data not available' : 'Failed to fetch extracted data');
    }
    return response.json();
  },

  async getLeadScrapedMarkdown(leadId: string): Promise<string> {
    const token = await getIdToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const response = await fetch(`${API_BASE_URL}/leads/${leadId}/scraped-markdown`, { headers });
    if (!response.ok) {
      throw new Error(response.status === 404 ? 'Scraped data not available' : 'Failed to fetch scraped data');
    }
    return response.text();
  },

  async getScrapedPageMarkdown(pageId: string): Promise<string> {
    const token = await getIdToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const response = await fetch(`${API_BASE_URL}/scraped-pages/${pageId}/markdown`, { headers });
    if (!response.ok) {
      throw new Error(response.status === 404 ? 'Markdown not available' : 'Failed to fetch markdown');
    }
    return response.text();
  },

  async deleteScrapedPage(pageId: string): Promise<void> {
    await apiClient(`/scraped-pages/${pageId}`, { method: 'DELETE' });
  },

  async createLeadContact(leadId: string, data: { email?: string; phone?: string; firstName?: string; lastName?: string }): Promise<{ id: string }> {
    return apiClient<{ id: string }>(`/leads/${leadId}/contacts`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async deleteLeadData(type: LeadDataType, id: string): Promise<void> {
    await apiClient(`/lead-data/${type}/${id}`, { method: 'DELETE' });
  },

  async updateLeadData(type: LeadDataType, id: string, data: Record<string, unknown>): Promise<unknown> {
    return apiClient(`/lead-data/${type}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async exportLeads(filters: LeadFilters, columns: string[], format?: 'csv' | 'xlsx'): Promise<{ downloadUrl: string; leadCount: number; fileName: string }> {
    return apiClient<{ downloadUrl: string; leadCount: number; fileName: string }>('/leads/export', {
      method: 'POST',
      body: JSON.stringify({ filters, columns, format }),
    });
  },

  // ===========================================
  // Cost Management
  // ===========================================

  async getCostSummary(start?: string, end?: string): Promise<CostSummary> {
    const qs = new URLSearchParams();
    if (start) qs.set('start', start);
    if (end) qs.set('end', end);
    return apiClient<CostSummary>(`/costs/summary?${qs}`);
  },

  async getCostsByService(start?: string, end?: string): Promise<CostRow[]> {
    const qs = new URLSearchParams();
    if (start) qs.set('start', start);
    if (end) qs.set('end', end);
    return apiClient<CostRow[]>(`/costs/by-service?${qs}`);
  },

  async getCostsByResource(start?: string, end?: string, service?: string): Promise<CostRow[]> {
    const qs = new URLSearchParams();
    if (start) qs.set('start', start);
    if (end) qs.set('end', end);
    if (service) qs.set('service', service);
    return apiClient<CostRow[]>(`/costs/by-resource?${qs}`);
  },

  async getCostsOverTime(start?: string, end?: string, granularity?: 'daily' | 'monthly'): Promise<CostOverTime[]> {
    const qs = new URLSearchParams();
    if (start) qs.set('start', start);
    if (end) qs.set('end', end);
    if (granularity) qs.set('granularity', granularity);
    return apiClient<CostOverTime[]>(`/costs/over-time?${qs}`);
  },

  async getCostsOverTimeByService(start?: string, end?: string): Promise<CostOverTime[]> {
    const qs = new URLSearchParams();
    if (start) qs.set('start', start);
    if (end) qs.set('end', end);
    return apiClient<CostOverTime[]>(`/costs/over-time-by-service?${qs}`);
  },
};
