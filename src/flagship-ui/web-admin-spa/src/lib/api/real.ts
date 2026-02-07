import type {
  WebAdminApi,
  TeamMember,
  FAQ,
  ServiceOffering,
  IndustrySector,
  CommunityService,
  CoreValue,
} from './types';
import type {
  Tombstone,
  BlogPost,
  PageContent,
  EmailSubscriber,
  SellerIntake,
  EmailNotification,
  User,
  UserRole,
  InviteUserInput,
  DashboardStats,
  ActivityItem,
  AnalyticsParams,
  PageViewData,
  TopPage,
  CreateTombstoneInput,
  UpdateTombstoneInput,
  CreateBlogPostInput,
  UpdateBlogPostInput,
  UpdatePageContentInput,
  CreateSubscriberInput,
  UpdateIntakeStatusInput,
  SendEmailInput,
} from '@/types';

// API base URL from environment
// Default to port 4000 for local Docker development
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

// Hardcoded dev token for local development
const DEV_TOKEN = 'dev-token-fca-admin-2024';

/**
 * Get authorization headers with auth token.
 * For local dev, uses hardcoded DEV_TOKEN.
 * TODO: Replace with Cognito getIdToken() in production.
 */
async function getAuthHeaders(): Promise<HeadersInit> {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${DEV_TOKEN}`,
  };
}

/**
 * Generic fetch wrapper with error handling
 */
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `API error: ${response.status}`);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

/**
 * Real API client implementation
 */
export const realApi: WebAdminApi = {
  // ============================================
  // DASHBOARD
  // ============================================

  async getDashboardStats(): Promise<DashboardStats> {
    const data = await apiFetch<{
      tombstones: number;
      blogPosts: number;
      subscribers: number;
      sellerIntakes: Record<string, number>;
      pageViews: number;
    }>('/admin/dashboard');

    return {
      totalTombstones: data.tombstones,
      totalBlogPosts: data.blogPosts,
      totalSubscribers: data.subscribers,
      intakesThisWeek: data.sellerIntakes.new || 0,
    };
  },

  async getRecentActivity(): Promise<ActivityItem[]> {
    // TODO: Implement activity feed endpoint
    // For now, return empty array
    return [];
  },

  // ============================================
  // TOMBSTONES
  // ============================================

  async getTombstones(): Promise<Tombstone[]> {
    const data = await apiFetch<{ items: Tombstone[] }>('/admin/tombstones?limit=100');
    return data.items;
  },

  async getTombstone(id: string): Promise<Tombstone> {
    return apiFetch<Tombstone>(`/admin/tombstones/${id}`);
  },

  async createTombstone(input: CreateTombstoneInput): Promise<Tombstone> {
    return apiFetch<Tombstone>('/admin/tombstones', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async updateTombstone(id: string, input: UpdateTombstoneInput): Promise<Tombstone> {
    return apiFetch<Tombstone>(`/admin/tombstones/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
  },

  async deleteTombstone(id: string): Promise<void> {
    await apiFetch<void>(`/admin/tombstones/${id}`, {
      method: 'DELETE',
    });
  },

  async publishTombstone(id: string, isPublished: boolean): Promise<Tombstone> {
    return apiFetch<Tombstone>(`/admin/tombstones/${id}/publish`, {
      method: 'POST',
      body: JSON.stringify({ publish: isPublished }),
    });
  },

  async reorderTombstones(ids: string[]): Promise<void> {
    // TODO: Implement reorder endpoint
    const items = ids.map((id, index) => ({ id, sortOrder: index }));
    await apiFetch<void>('/admin/tombstones/reorder', {
      method: 'POST',
      body: JSON.stringify({ items }),
    });
  },

  // ============================================
  // BLOG POSTS
  // ============================================

  async getBlogPosts(category?: string): Promise<BlogPost[]> {
    const params = new URLSearchParams({ limit: '200' });
    if (category) params.set('category', category);
    const data = await apiFetch<{ items: BlogPost[] }>(`/admin/blog-posts?${params}`);
    return data.items;
  },

  async getBlogPost(id: string): Promise<BlogPost> {
    return apiFetch<BlogPost>(`/admin/blog-posts/${id}`);
  },

  async createBlogPost(input: CreateBlogPostInput): Promise<BlogPost> {
    return apiFetch<BlogPost>('/admin/blog-posts', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async updateBlogPost(id: string, input: UpdateBlogPostInput): Promise<BlogPost> {
    return apiFetch<BlogPost>(`/admin/blog-posts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
  },

  async deleteBlogPost(id: string): Promise<void> {
    await apiFetch<void>(`/admin/blog-posts/${id}`, {
      method: 'DELETE',
    });
  },

  async publishBlogPost(id: string, isPublished: boolean): Promise<BlogPost> {
    return apiFetch<BlogPost>(`/admin/blog-posts/${id}/publish`, {
      method: 'POST',
      body: JSON.stringify({ publish: isPublished }),
    });
  },

  // ============================================
  // PAGE CONTENT
  // ============================================

  async getPages(): Promise<PageContent[]> {
    return apiFetch<PageContent[]>('/admin/pages');
  },

  async getPage(pageKey: string): Promise<PageContent> {
    return apiFetch<PageContent>(`/admin/pages/${pageKey}`);
  },

  async updatePage(pageKey: string, input: UpdatePageContentInput): Promise<PageContent> {
    return apiFetch<PageContent>(`/admin/pages/${pageKey}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
  },

  // ============================================
  // ANALYTICS
  // ============================================

  async getPageViews(params: AnalyticsParams): Promise<PageViewData[]> {
    const query = new URLSearchParams({
      startDate: params.start,
      endDate: params.end,
    });
    const data = await apiFetch<Array<{ hour: string; views: number }>>(`/admin/analytics/trends?${query}`);
    return data.map((d) => ({
      timestamp: d.hour,
      count: d.views,
    }));
  },

  async getTopPages(params: AnalyticsParams & { limit?: number }): Promise<TopPage[]> {
    const query = new URLSearchParams();
    if (params.limit) query.set('limit', params.limit.toString());
    const data = await apiFetch<Array<{ path: string; views: number }>>(`/admin/analytics/top-pages?${query}`);
    return data;
  },

  // ============================================
  // SUBSCRIBERS
  // ============================================

  async getSubscribers(): Promise<EmailSubscriber[]> {
    const data = await apiFetch<{ items: EmailSubscriber[] }>('/admin/subscribers?limit=500');
    return data.items;
  },

  async createSubscriber(input: CreateSubscriberInput): Promise<EmailSubscriber> {
    // Use public subscribe endpoint
    return apiFetch<EmailSubscriber>('/subscribe', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async deleteSubscriber(id: string): Promise<void> {
    await apiFetch<void>(`/admin/subscribers/${id}`, {
      method: 'DELETE',
    });
  },

  async exportSubscribers(): Promise<Blob> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/admin/subscribers/export`, {
      headers,
    });
    return response.blob();
  },

  async importSubscribers(_file: File): Promise<{ imported: number; skipped: number }> {
    // TODO: Implement import endpoint
    return { imported: 0, skipped: 0 };
  },

  // ============================================
  // SELLER INTAKES
  // ============================================

  async getIntakes(): Promise<SellerIntake[]> {
    const data = await apiFetch<{ items: SellerIntake[] }>('/admin/seller-intakes?limit=100');
    return data.items;
  },

  async getIntake(id: string): Promise<SellerIntake> {
    return apiFetch<SellerIntake>(`/admin/seller-intakes/${id}`);
  },

  async updateIntakeStatus(id: string, input: UpdateIntakeStatusInput): Promise<SellerIntake> {
    return apiFetch<SellerIntake>(`/admin/seller-intakes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
  },

  async exportIntakes(): Promise<Blob> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/admin/seller-intakes/export`, {
      headers,
    });
    return response.blob();
  },

  // ============================================
  // EMAIL
  // ============================================

  async sendEmail(input: SendEmailInput): Promise<{ sent: number }> {
    return apiFetch<{ sent: number }>('/admin/email/send', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async previewEmail(input: SendEmailInput): Promise<{ html: string }> {
    return apiFetch<{ html: string }>('/admin/email/preview', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async getEmailHistory(): Promise<EmailNotification[]> {
    return apiFetch<EmailNotification[]>('/admin/email/history');
  },

  // ============================================
  // USERS
  // ============================================

  async getUsers(): Promise<User[]> {
    return apiFetch<User[]>('/admin/users');
  },

  async inviteUser(input: InviteUserInput): Promise<User> {
    return apiFetch<User>('/admin/users/invite', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async updateUserRole(id: string, role: UserRole): Promise<User> {
    return apiFetch<User>(`/admin/users/${id}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
  },

  async removeUser(id: string): Promise<void> {
    await apiFetch<void>(`/admin/users/${id}`, {
      method: 'DELETE',
    });
  },

  // ============================================
  // STATIC CONTENT - TEAM MEMBERS
  // ============================================

  async getTeamMembers(): Promise<TeamMember[]> {
    const data = await apiFetch<{ items: TeamMember[] }>('/admin/team-members');
    return data.items || [];
  },

  async createTeamMember(data: Partial<TeamMember>): Promise<TeamMember> {
    return apiFetch<TeamMember>('/admin/team-members', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateTeamMember(id: string, data: Partial<TeamMember>): Promise<TeamMember> {
    return apiFetch<TeamMember>(`/admin/team-members/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteTeamMember(id: string): Promise<void> {
    await apiFetch<void>(`/admin/team-members/${id}`, {
      method: 'DELETE',
    });
  },

  // ============================================
  // STATIC CONTENT - FAQs
  // ============================================

  async getFAQs(): Promise<FAQ[]> {
    const data = await apiFetch<{ items: FAQ[] }>('/admin/faqs');
    return data.items || [];
  },

  async createFAQ(data: Partial<FAQ>): Promise<FAQ> {
    return apiFetch<FAQ>('/admin/faqs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateFAQ(id: string, data: Partial<FAQ>): Promise<FAQ> {
    return apiFetch<FAQ>(`/admin/faqs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteFAQ(id: string): Promise<void> {
    await apiFetch<void>(`/admin/faqs/${id}`, {
      method: 'DELETE',
    });
  },

  // ============================================
  // STATIC CONTENT - SERVICES
  // ============================================

  async getServices(): Promise<ServiceOffering[]> {
    const data = await apiFetch<{ items: ServiceOffering[] }>('/admin/service-offerings');
    return data.items || [];
  },

  async createService(data: Partial<ServiceOffering>): Promise<ServiceOffering> {
    return apiFetch<ServiceOffering>('/admin/service-offerings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateService(id: string, data: Partial<ServiceOffering>): Promise<ServiceOffering> {
    return apiFetch<ServiceOffering>(`/admin/service-offerings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteService(id: string): Promise<void> {
    await apiFetch<void>(`/admin/service-offerings/${id}`, {
      method: 'DELETE',
    });
  },

  // ============================================
  // STATIC CONTENT - INDUSTRIES
  // ============================================

  async getIndustries(): Promise<IndustrySector[]> {
    const data = await apiFetch<{ items: IndustrySector[] }>('/admin/industries');
    return data.items || [];
  },

  async createIndustry(data: Partial<IndustrySector>): Promise<IndustrySector> {
    return apiFetch<IndustrySector>('/admin/industries', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateIndustry(id: string, data: Partial<IndustrySector>): Promise<IndustrySector> {
    return apiFetch<IndustrySector>(`/admin/industry-sectors/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteIndustry(id: string): Promise<void> {
    await apiFetch<void>(`/admin/industry-sectors/${id}`, {
      method: 'DELETE',
    });
  },

  // ============================================
  // STATIC CONTENT - COMMUNITY SERVICES
  // ============================================

  async getCommunityServices(): Promise<CommunityService[]> {
    const data = await apiFetch<{ items: CommunityService[] }>('/admin/community-services');
    return data.items || [];
  },

  async createCommunityService(data: Partial<CommunityService>): Promise<CommunityService> {
    return apiFetch<CommunityService>('/admin/community-services', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateCommunityService(id: string, data: Partial<CommunityService>): Promise<CommunityService> {
    return apiFetch<CommunityService>(`/admin/community-services/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteCommunityService(id: string): Promise<void> {
    await apiFetch<void>(`/admin/community-services/${id}`, {
      method: 'DELETE',
    });
  },

  // ============================================
  // STATIC CONTENT - CORE VALUES
  // ============================================

  async getCoreValues(): Promise<CoreValue[]> {
    const data = await apiFetch<{ items: CoreValue[] }>('/admin/core-values');
    return data.items || [];
  },

  async createCoreValue(data: Partial<CoreValue>): Promise<CoreValue> {
    return apiFetch<CoreValue>('/admin/core-values', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateCoreValue(id: string, data: Partial<CoreValue>): Promise<CoreValue> {
    return apiFetch<CoreValue>(`/admin/core-values/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteCoreValue(id: string): Promise<void> {
    await apiFetch<void>(`/admin/core-values/${id}`, {
      method: 'DELETE',
    });
  },
};
