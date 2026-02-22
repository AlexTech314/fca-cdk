import type { LeadGenApi } from './types';
import type {
  Lead,
  Campaign,
  CampaignRun,
  LeadFilters,
  User,
} from '@/types';
import {
  mockLeads,
  mockCampaigns,
  mockCampaignRuns,
  mockCampaignsWithStats,
  mockUsers,
  mockOrganization,
  generateLeadsOverTime,
  generateCampaignsOverTime,
  getBusinessTypeDistribution,
  getLocationDistribution,
} from '../mock-data';
import { generateId } from '../utils';

// Simulate network latency
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const randomDelay = () => delay(200 + Math.random() * 300);

// In-memory state for mutations
let leads = [...mockLeads];
let campaigns = [...mockCampaigns];
let campaignRuns = [...mockCampaignRuns];
let users = [...mockUsers];

/**
 * Mock API Implementation
 * 
 * This implementation uses static mock data and simulates network latency.
 * All filtering, sorting, and pagination happens in-memory.
 */
export const mockApi: LeadGenApi = {
  // ===========================================
  // Dashboard
  // ===========================================
  
  async getDashboardStats() {
    await randomDelay();
    return {
      totalLeads: leads.length,
      campaignsRun: campaignRuns.filter(r => r.status === 'completed').length,
      qualifiedLeads: leads.filter(l => l.qualificationScore !== null).length,
      exports: 47,
    };
  },

  async getLeadsOverTime(params) {
    await randomDelay();
    const days = Math.ceil(
      (new Date(params.endDate).getTime() - new Date(params.startDate).getTime()) / 
      (1000 * 60 * 60 * 24)
    );
    return generateLeadsOverTime(days || 7);
  },

  async getCampaignsOverTime(params) {
    await randomDelay();
    const days = Math.ceil(
      (new Date(params.endDate).getTime() - new Date(params.startDate).getTime()) / 
      (1000 * 60 * 60 * 24)
    );
    return generateCampaignsOverTime(days || 7);
  },

  async getBusinessTypeDistribution() {
    await randomDelay();
    return getBusinessTypeDistribution();
  },

  async getLocationDistribution() {
    await randomDelay();
    return getLocationDistribution();
  },

  async getLocationsStates() {
    await randomDelay();
    return [
      { id: 'CO', name: 'Colorado' },
      { id: 'TX', name: 'Texas' },
      { id: 'AZ', name: 'Arizona' },
      { id: 'NV', name: 'Nevada' },
      { id: 'UT', name: 'Utah' },
    ];
  },

  // ===========================================
  // Leads
  // ===========================================

  async getLeads({ page, limit, sort, order, filters }) {
    await randomDelay();
    
    let filtered = [...leads];
    
    // Apply filters
    filtered = applyFilters(filtered, filters);
    
    // Sort
    filtered = sortLeads(filtered, sort, order);
    
    // Paginate
    const start = (page - 1) * limit;
    const data = filtered.slice(start, start + limit);
    
    return {
      data,
      total: filtered.length,
      page,
      limit,
      totalPages: Math.ceil(filtered.length / limit),
    };
  },

  async getLead(id) {
    await randomDelay();
    const lead = leads.find(l => l.id === id);
    if (!lead) {
      throw new Error('Lead not found');
    }
    
    const campaign = campaigns.find(c => c.id === lead.campaignId);
    
    return {
      ...lead,
      campaign,
    };
  },

  async getLeadCount({ filters }) {
    await randomDelay();
    return applyFilters(leads, filters).length;
  },

  async qualifyLead(id) {
    await delay(1000); // Simulate AI processing
    const lead = leads.find(l => l.id === id);
    if (!lead) {
      throw new Error('Lead not found');
    }
    
    // Simulate AI qualification
    const score = Math.floor(Math.random() * 40) + 60;
    const qualifiedLead: Lead = {
      ...lead,
      qualificationScore: score,
      qualificationNotes: generateQualificationNotes(score),
      qualifiedAt: new Date().toISOString(),
    };
    
    // Update in-memory state
    leads = leads.map(l => l.id === id ? qualifiedLead : l);
    
    return qualifiedLead;
  },

  async qualifyLeadsBulk(ids) {
    const results: Lead[] = [];
    for (const id of ids) {
      const lead = await this.qualifyLead(id);
      results.push(lead);
    }
    return results;
  },

  // ===========================================
  // Campaigns
  // ===========================================

  async getCampaigns() {
    await randomDelay();
    return mockCampaignsWithStats;
  },

  async getCampaign(id) {
    await randomDelay();
    const campaign = campaigns.find(c => c.id === id);
    if (!campaign) {
      throw new Error('Campaign not found');
    }
    return campaign;
  },

  async createCampaign(data) {
    await randomDelay();
    const newCampaign: Campaign = {
      id: `campaign-${generateId()}`,
      name: data.name,
      description: data.description || null,
      queries: data.queries,
      createdById: users[0].id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    campaigns = [...campaigns, newCampaign];
    return newCampaign;
  },

  async updateCampaign(id, data) {
    await randomDelay();
    const campaign = campaigns.find(c => c.id === id);
    if (!campaign) {
      throw new Error('Campaign not found');
    }
    
    const updated: Campaign = {
      ...campaign,
      name: data.name ?? campaign.name,
      description: data.description ?? campaign.description,
      queries: data.queries ?? campaign.queries,
      updatedAt: new Date().toISOString(),
    };
    
    campaigns = campaigns.map(c => c.id === id ? updated : c);
    return updated;
  },

  async deleteCampaign(id) {
    await randomDelay();
    campaigns = campaigns.filter(c => c.id !== id);
  },

  // ===========================================
  // Campaign Runs
  // ===========================================

  async getCampaignRuns(campaignId) {
    await randomDelay();
    return campaignRuns
      .filter(r => r.campaignId === campaignId)
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  },

  async getCampaignRun(runId) {
    await randomDelay();
    const run = campaignRuns.find(r => r.id === runId);
    if (!run) {
      throw new Error('Campaign run not found');
    }
    return run;
  },

  async startCampaignRun(campaignId) {
    await randomDelay();
    const campaign = campaigns.find(c => c.id === campaignId);
    if (!campaign) {
      throw new Error('Campaign not found');
    }
    
    const newRun: CampaignRun = {
      id: `run-${generateId()}`,
      campaignId,
      startedById: users[0].id,
      status: 'running',
      startedAt: new Date().toISOString(),
      completedAt: null,
      queriesTotal: campaign.queries.length,
      queriesExecuted: 0,
      leadsFound: 0,
      duplicatesSkipped: 0,
      errors: 0,
      errorMessages: [],
    };
    
    campaignRuns = [...campaignRuns, newRun];
    return newRun;
  },

  // ===========================================
  // Franchises
  // ===========================================

  async getFranchises() {
    await randomDelay();
    return [];
  },

  async getFranchise(_id: string) {
    await randomDelay();
    throw new Error('Franchise not found');
  },

  // ===========================================
  // Users
  // ===========================================

  async getUsers() {
    await randomDelay();
    return users;
  },

  async inviteUser(data) {
    await randomDelay();
    const newUser: User = {
      id: `user-${generateId()}`,
      email: data.email,
      name: data.name || null,
      cognitoSub: null,
      role: data.role,
      invitedAt: new Date().toISOString(),
      lastActiveAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    users = [...users, newUser];
    return newUser;
  },

  async updateUserRole(id, role) {
    await randomDelay();
    const user = users.find(u => u.id === id);
    if (!user) {
      throw new Error('User not found');
    }
    
    const updated: User = {
      ...user,
      role,
      updatedAt: new Date().toISOString(),
    };
    
    users = users.map(u => u.id === id ? updated : u);
    return updated;
  },

  async removeUser(id) {
    await randomDelay();
    users = users.filter(u => u.id !== id);
  },

  // ===========================================
  // Usage
  // ===========================================

  async getUsage() {
    await randomDelay();
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    return {
      leadsThisMonth: leads.filter(l => new Date(l.createdAt) >= startOfMonth).length,
      exportsThisMonth: 12,
      qualificationsThisMonth: leads.filter(l => l.qualifiedAt && new Date(l.qualifiedAt) >= startOfMonth).length,
      periodStart: startOfMonth.toISOString(),
      periodEnd: endOfMonth.toISOString(),
    };
  },

  async getUsageLimits() {
    await randomDelay();
    return {
      leadsPerMonth: mockOrganization.usageLimitLeads,
      exportsPerMonth: mockOrganization.usageLimitExports,
      qualificationsPerMonth: 1000,
    };
  },

  async listTasks(params: { page?: number; limit?: number; type?: string; status?: string }) {
    await randomDelay();
    const mockTasks: import('@/types').FargateTask[] = [
      { id: '1', type: 'places_search', status: 'completed', taskArn: 'arn:aws:ecs:us-east-1:123:task/cluster/abc', startedAt: new Date(Date.now() - 3600000).toISOString(), completedAt: new Date().toISOString(), errorMessage: null, metadata: null, createdAt: new Date(Date.now() - 3600000).toISOString(), updatedAt: new Date().toISOString() },
      { id: '2', type: 'web_scrape', status: 'running', taskArn: 'arn:aws:ecs:us-east-1:123:task/cluster/def', startedAt: new Date(Date.now() - 120000).toISOString(), completedAt: null, errorMessage: null, metadata: null, createdAt: new Date(Date.now() - 120000).toISOString(), updatedAt: new Date().toISOString() },
      { id: '3', type: 'ai_scoring', status: 'pending', taskArn: null, startedAt: null, completedAt: null, errorMessage: null, metadata: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ];
    const page = params.page ?? 1;
    const limit = params.limit ?? 50;
    let filtered = mockTasks;
    if (params.type) filtered = filtered.filter(t => t.type === params.type);
    if (params.status) filtered = filtered.filter(t => t.status === params.status);
    const total = filtered.length;
    const start = (page - 1) * limit;
    const data = filtered.slice(start, start + limit) as import('@/types').FargateTask[];
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async getTask(id: string) {
    await randomDelay();
    const tasks = await this.listTasks({});
    const task = tasks.data.find(t => t.id === id);
    if (!task) throw new Error('Task not found');
    return task;
  },

  async cancelTask(id: string) {
    await randomDelay();
    const task = await this.getTask(id);
    return { ...task, status: 'cancelled' as const };
  },
};

// ===========================================
// Helper Functions
// ===========================================

function applyFilters(leads: Lead[], filters: LeadFilters): Lead[] {
  let filtered = [...leads];
  
  if (filters.name) {
    const searchTerm = filters.name.toLowerCase();
    filtered = filtered.filter(l => l.name.toLowerCase().includes(searchTerm));
  }
  
  if (filters.cityId) {
    // Mock: leads don't have cityId; skip this filter in mock mode
  }
  
  if (filters.stateIds?.length) {
    filtered = filtered.filter(l => l.state && filters.stateIds!.includes(l.state));
  }
  
  if (filters.businessTypes?.length) {
    filtered = filtered.filter(l => l.businessType && filters.businessTypes!.includes(l.businessType));
  }
  
  if (filters.campaignId) {
    filtered = filtered.filter(l => l.campaignId === filters.campaignId);
  }
  
  if (filters.ratingMin !== undefined) {
    filtered = filtered.filter(l => l.rating !== null && l.rating >= filters.ratingMin!);
  }
  
  if (filters.ratingMax !== undefined) {
    filtered = filtered.filter(l => l.rating !== null && l.rating <= filters.ratingMax!);
  }
  
  if (filters.qualificationMin !== undefined) {
    filtered = filtered.filter(l => l.qualificationScore !== null && l.qualificationScore >= filters.qualificationMin!);
  }
  
  if (filters.qualificationMax !== undefined) {
    filtered = filtered.filter(l => l.qualificationScore !== null && l.qualificationScore <= filters.qualificationMax!);
  }
  
  if (filters.hasWebsite !== undefined) {
    filtered = filtered.filter(l => filters.hasWebsite ? l.website !== null : l.website === null);
  }
  
  if (filters.hasPhone !== undefined) {
    filtered = filtered.filter(l => filters.hasPhone ? l.phone !== null : l.phone === null);
  }
  
  return filtered;
}

function sortLeads(leads: Lead[], sort: string, order: 'asc' | 'desc'): Lead[] {
  return [...leads].sort((a, b) => {
    let aVal: string | number | null = null;
    let bVal: string | number | null = null;
    
    switch (sort) {
      case 'name':
        aVal = a.name;
        bVal = b.name;
        break;
      case 'city':
        aVal = a.city || '';
        bVal = b.city || '';
        break;
      case 'state':
        aVal = a.state || '';
        bVal = b.state || '';
        break;
      case 'rating':
        aVal = a.rating || 0;
        bVal = b.rating || 0;
        break;
      case 'qualificationScore':
        aVal = a.qualificationScore || 0;
        bVal = b.qualificationScore || 0;
        break;
      case 'createdAt':
      default:
        aVal = new Date(a.createdAt).getTime();
        bVal = new Date(b.createdAt).getTime();
    }
    
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return order === 'asc' 
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }
    
    return order === 'asc' 
      ? (aVal as number) - (bVal as number)
      : (bVal as number) - (aVal as number);
  });
}

function generateQualificationNotes(score: number): string {
  if (score >= 80) {
    return '• Strong online presence with professional website\n• High review count and excellent ratings\n• Established business with 5+ years operation\n• Good geographic coverage';
  } else if (score >= 60) {
    return '• Moderate online presence\n• Decent reviews and ratings\n• Growing business with potential\n• Limited service area';
  } else {
    return '• Limited online presence\n• Few reviews\n• New or small operation\n• May need more research';
  }
}
