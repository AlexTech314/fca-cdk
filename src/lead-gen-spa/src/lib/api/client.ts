/**
 * Real API Client
 *
 * Implements the LeadGenApi interface with real HTTP calls to the Express API.
 * Backend uses snake_case; frontend uses camelCase. Transforms happen here.
 */

import type { LeadGenApi } from './types';
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
} from '@/types';
import { getIdToken } from '../auth';
import { API_BASE_URL } from '../amplify-config';

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

// ============================================
// Transform Helpers (snake_case -> camelCase)
// ============================================

function transformFranchise(raw: any): Franchise {
  return {
    id: raw.id,
    name: raw.name,
    displayName: raw.displayName ?? raw.display_name ?? null,
    locationCount: raw.locationCount ?? raw.location_count,
  };
}

function transformLead(raw: any): Lead {
  return {
    id: raw.id,
    placeId: raw.placeId || raw.place_id,
    campaignId: raw.campaignId || raw.campaign_id || null,
    campaignRunId: raw.campaignRunId || raw.campaign_run_id || null,
    name: raw.name,
    address: raw.address || null,
    city: raw.city || null,
    state: raw.state || null,
    zipCode: raw.zipCode || raw.zip_code || null,
    phone: raw.phone || null,
    website: raw.website || null,
    rating: raw.rating ?? null,
    reviewCount: raw.reviewCount ?? raw.review_count ?? null,
    priceLevel: raw.priceLevel ?? raw.price_level ?? null,
    businessType: raw.businessType || raw.business_type || null,
    qualificationScore: raw.qualificationScore ?? raw.qualification_score ?? null,
    qualificationNotes: raw.qualificationNotes || raw.qualification_notes || null,
    qualifiedAt: raw.qualifiedAt || raw.qualified_at || null,
    source: raw.source || null,
    franchiseId: raw.franchiseId ?? raw.franchise_id ?? null,
    franchise: raw.franchise ? transformFranchise(raw.franchise) : null,
    campaign: raw.campaign ? { id: raw.campaign.id, name: raw.campaign.name } : null,
    createdAt: raw.createdAt || raw.created_at,
    updatedAt: raw.updatedAt || raw.updated_at,
  };
}

function transformCampaign(raw: any): Campaign {
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description || null,
    queries: raw.searches || raw.queries || [],
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

function transformUser(raw: any): User {
  return {
    id: raw.id,
    email: raw.email,
    name: raw.name || null,
    cognitoSub: raw.cognitoSub || raw.cognito_sub || null,
    role: raw.role,
    invitedAt: raw.createdAt || raw.created_at,
    lastActiveAt: raw.lastActiveAt || raw.last_active_at || null,
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
    });
    return apiClient<TimeSeriesData[]>(`/dashboard/leads-over-time?${qs}`);
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

  // ===========================================
  // Leads
  // ===========================================

  async getLeads(params: LeadQueryParams): Promise<PaginatedResponse<Lead>> {
    const qs = new URLSearchParams();
    qs.set('page', String(params.page));
    qs.set('limit', String(params.limit));
    qs.set('sort', params.sort);
    qs.set('order', params.order);

    const { filters } = params;
    if (filters.name) qs.set('name', filters.name);
    if (filters.city) qs.set('city', filters.city);
    if (filters.states?.length) qs.set('states', filters.states.join(','));
    if (filters.businessTypes?.length) qs.set('businessTypes', filters.businessTypes.join(','));
    if (filters.campaignId) qs.set('campaignId', filters.campaignId);
    if (filters.ratingMin !== undefined) qs.set('ratingMin', String(filters.ratingMin));
    if (filters.ratingMax !== undefined) qs.set('ratingMax', String(filters.ratingMax));
    if (filters.qualificationMin !== undefined) qs.set('qualificationMin', String(filters.qualificationMin));
    if (filters.qualificationMax !== undefined) qs.set('qualificationMax', String(filters.qualificationMax));
    if (filters.hasWebsite !== undefined) qs.set('hasWebsite', String(filters.hasWebsite));
    if (filters.hasPhone !== undefined) qs.set('hasPhone', String(filters.hasPhone));
    if (filters.franchiseId) qs.set('franchiseId', filters.franchiseId);

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

  async getLead(id: string): Promise<LeadWithCampaign> {
    const raw = await apiClient<any>(`/leads/${id}`);
    return transformLead(raw) as LeadWithCampaign;
  },

  async getLeadCount(params: LeadQueryParams): Promise<number> {
    const qs = new URLSearchParams();
    const { filters } = params;
    if (filters.name) qs.set('name', filters.name);
    if (filters.states?.length) qs.set('states', filters.states.join(','));
    if (filters.businessTypes?.length) qs.set('businessTypes', filters.businessTypes.join(','));
    if (filters.campaignId) qs.set('campaignId', filters.campaignId);
    if (filters.franchiseId) qs.set('franchiseId', filters.franchiseId);

    const result = await apiClient<{ count: number }>(`/leads/count?${qs}`);
    return result.count;
  },

  async qualifyLead(id: string): Promise<Lead> {
    const raw = await apiClient<any>(`/leads/${id}/qualify`, { method: 'POST' });
    return transformLead(raw);
  },

  async qualifyLeadsBulk(ids: string[]): Promise<Lead[]> {
    // Upload IDs to S3 via presigned URL, then call bulk qualify with S3 key
    // For now, qualify one by one (TODO: implement S3 upload pattern)
    const results: Lead[] = [];
    for (const id of ids) {
      results.push(await this.qualifyLead(id));
    }
    return results;
  },

  // ===========================================
  // Campaigns
  // ===========================================

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
      body: JSON.stringify({ name: data.name, description: data.description }),
    });

    // Upload queries to S3 via presigned URL
    if (data.queries.length > 0 && result.uploadUrl) {
      const payload = {
        searches: data.queries.map((q) => ({ textQuery: q })),
        count: data.queries.length,
        uploadedAt: new Date().toISOString(),
      };

      await fetch(result.uploadUrl, {
        method: 'PUT',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
      });

      // Confirm upload
      await apiClient(`/campaigns/${result.campaign.id}/confirm-upload`, {
        method: 'POST',
        body: JSON.stringify({ searchesCount: data.queries.length }),
      });
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
        updateSearches: hasNewQueries,
      }),
    });

    // Upload new queries if provided
    if (hasNewQueries && result.uploadUrl) {
      const payload = {
        searches: data.queries!.map((q) => ({ textQuery: q })),
        count: data.queries!.length,
        uploadedAt: new Date().toISOString(),
      };

      await fetch(result.uploadUrl, {
        method: 'PUT',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
      });

      await apiClient(`/campaigns/${result.campaign.id}/confirm-upload`, {
        method: 'POST',
        body: JSON.stringify({ searchesCount: data.queries!.length }),
      });
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
    const result = await apiClient<any>('/users');
    const items = result.items || result.data || result;
    return (Array.isArray(items) ? items : []).map(transformUser);
  },

  async inviteUser(data: InviteUserInput): Promise<User> {
    const raw = await apiClient<any>('/users/invite', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return transformUser(raw);
  },

  async updateUserRole(id: string, role: User['role']): Promise<User> {
    const raw = await apiClient<any>(`/users/${id}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
    return transformUser(raw);
  },

  async removeUser(id: string): Promise<void> {
    await apiClient(`/users/${id}`, { method: 'DELETE' });
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
};
