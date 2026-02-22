/**
 * API Client for Next.js
 *
 * Server-side fetch to API endpoints with no caching (dynamic rendering).
 * Per nextjs-web/PLAN.md, all pages must use dynamic rendering from the API.
 */

// API base URL from environment
// Default to port 4000 for local Docker development
const API_URL = process.env.API_URL || 'http://localhost:4000/api';

type NextRequestInit = RequestInit & {
  next?: {
    revalidate?: number;
    tags?: string[];
  };
};

/**
 * Default fetch options:
 * - GET requests: cacheable with periodic revalidation for better performance/bfcache
 * - Mutations: explicitly no-store
 */
const baseHeaders = {
  'Content-Type': 'application/json',
};

/**
 * Generic fetch wrapper with error handling
 */
async function apiFetch<T>(endpoint: string, options?: NextRequestInit): Promise<T> {
  const method = (options?.method || 'GET').toUpperCase();
  const isGet = method === 'GET';

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      ...baseHeaders,
      ...(options?.headers || {}),
    },
    ...(isGet
      ? {
          cache: 'force-cache',
          next: {
            revalidate: 60,
            ...(options?.next || {}),
          },
        }
      : { cache: 'no-store' }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `API error: ${response.status}`);
  }

  return response.json();
}

/**
 * POST to API endpoint
 */
async function apiPost<T>(endpoint: string, body: unknown): Promise<T> {
  return apiFetch<T>(endpoint, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

// ============================================
// TYPES
// ============================================

export interface ApiSiteConfig {
  id: string;
  name: string;
  tagline: string | null;
  url: string;
  description: string | null;
  phone: string | null;
  email: string | null;
  linkedIn: string | null;
  ogImage: string | null;
  locations: { city: string; state: string }[];
  navItems: { name: string; href: string }[];
  footerNav: {
    services: { name: string; href: string }[];
    company: { name: string; href: string }[];
    resources: { name: string; href: string }[];
  };
  serviceTypes: string[];
  companyBlurb: string | null;
  updatedAt: string;
}

export interface ApiLocationState {
  id: string;
  name: string;
}

export interface ApiLocationCity {
  id: number;
  name: string;
  stateId: string;
  stateName?: string;
}

export interface ApiTombstone {
  id: string;
  name: string;
  slug: string;
  assetId: string | null;
  asset?: {
    id: string;
    s3Key: string;
    fileName: string;
    fileType: string;
  } | null;
  industry: string | null;
  role: string | null;
  buyerPeFirm: string | null;
  buyerPlatform: string | null;
  transactionYear: number | null;
  locationStates: ApiLocationState[];
  locationCities: ApiLocationCity[];
  sortOrder: number;
  isPublished: boolean;
  previewToken: string;
  createdAt: string;
  updatedAt: string;
  industries: { id: string; name: string; slug: string }[];
  dealTypes: { id: string; name: string; slug: string }[];
  pressRelease?: {
    id: string;
    slug: string;
    title: string;
  } | null;
}

export interface ApiBlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  author: string | null;
  category: string | null;
  publishedAt: string | null;
  isPublished: boolean;
  previewToken: string;
  createdAt: string;
  updatedAt: string;
  industries: { id: string; name: string; slug: string }[];
  tombstone?: {
    id: string;
    slug: string;
    name: string;
  } | null;
}

export interface ApiPageContent {
  id: string;
  pageKey: string;
  title: string;
  content: string;
  metadata: Record<string, unknown> | null;
  previewToken: string;
  updatedAt: string;
}

export interface ApiTeamMember {
  id: string;
  name: string;
  title: string;
  image: string | null;
  bio: string;
  email: string | null;
  linkedIn: string | null;
  category: string;
  sortOrder: number;
  isPublished: boolean;
}

export interface ApiFAQ {
  id: string;
  question: string;
  answer: string;
  sortOrder: number;
  isPublished: boolean;
}

export interface ApiCoreValue {
  id: string;
  title: string;
  description: string;
  icon: string;
  sortOrder: number;
  isPublished: boolean;
}

export interface ApiIndustrySector {
  id: string;
  name: string;
  description: string;
  sortOrder: number;
  isPublished: boolean;
}

export interface ApiServiceOffering {
  id: string;
  title: string;
  description: string | null;
  category: string;
  type: string;
  step: number | null;
  sortOrder: number;
  isPublished: boolean;
}

export interface ApiAward {
  id: string;
  name: string;
  image: string;
  sortOrder: number;
  isPublished: boolean;
}

export interface ApiCommunityService {
  id: string;
  name: string;
  description: string;
  url: string;
  sortOrder: number;
  isPublished: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============================================
// SITE CONFIG
// ============================================

export async function getSiteConfig(): Promise<ApiSiteConfig | null> {
  try {
    return await apiFetch<ApiSiteConfig>('/site-config');
  } catch {
    return null;
  }
}

// ============================================
// TOMBSTONES
// ============================================

export interface TombstoneFilterOptions {
  states: ApiLocationState[];
  cities: ApiLocationCity[];
  years: number[];
  industries: { id: string; slug: string; name: string }[];
}

export async function getTombstones(params?: {
  page?: number;
  limit?: number;
  industry?: string;
  state?: string;
  city?: string;
  year?: number;
  search?: string;
}): Promise<PaginatedResponse<ApiTombstone>> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', params.page.toString());
  if (params?.limit) query.set('limit', params.limit.toString());
  if (params?.industry) query.set('industry', params.industry);
  if (params?.state) query.set('state', params.state);
  if (params?.city) query.set('city', params.city);
  if (params?.year) query.set('year', params.year.toString());
  if (params?.search) query.set('search', params.search);

  const queryStr = query.toString();
  return apiFetch<PaginatedResponse<ApiTombstone>>(`/tombstones${queryStr ? `?${queryStr}` : ''}`);
}

export async function getTombstoneFilters(): Promise<TombstoneFilterOptions> {
  return apiFetch<TombstoneFilterOptions>('/tombstones/filters');
}

export async function getTombstoneBySlug(slug: string): Promise<ApiTombstone | null> {
  try {
    return await apiFetch<ApiTombstone>(`/tombstones/${slug}`);
  } catch {
    return null;
  }
}

export async function getRelatedNewsForTombstone(slug: string): Promise<ApiBlogPost[]> {
  try {
    return await apiFetch<ApiBlogPost[]>(`/tombstones/${slug}/related`);
  } catch {
    return [];
  }
}

// ============================================
// BLOG POSTS
// ============================================

export async function getBlogPosts(params?: {
  page?: number;
  limit?: number;
  category?: string;
  industry?: string;
  search?: string;
}): Promise<PaginatedResponse<ApiBlogPost>> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', params.page.toString());
  if (params?.limit) query.set('limit', params.limit.toString());
  if (params?.category) query.set('category', params.category);
  if (params?.industry) query.set('industry', params.industry);
  if (params?.search) query.set('search', params.search);

  const queryStr = query.toString();
  return apiFetch<PaginatedResponse<ApiBlogPost>>(`/blog-posts${queryStr ? `?${queryStr}` : ''}`);
}

export async function getBlogPostBySlug(slug: string): Promise<ApiBlogPost | null> {
  try {
    return await apiFetch<ApiBlogPost>(`/blog-posts/${slug}`);
  } catch {
    return null;
  }
}

export async function getRelatedContentForBlogPost(
  slug: string
): Promise<{ tombstones: ApiTombstone[]; articles: ApiBlogPost[] }> {
  try {
    return await apiFetch<{ tombstones: ApiTombstone[]; articles: ApiBlogPost[] }>(
      `/blog-posts/${slug}/related`
    );
  } catch {
    return { tombstones: [], articles: [] };
  }
}

export async function getAdjacentBlogPosts(slug: string): Promise<{
  prev: { slug: string; title: string; publishedAt: string | null } | null;
  next: { slug: string; title: string; publishedAt: string | null } | null;
} | null> {
  try {
    return await apiFetch<{
      prev: { slug: string; title: string; publishedAt: string | null } | null;
      next: { slug: string; title: string; publishedAt: string | null } | null;
    }>(`/blog-posts/${slug}/adjacent`);
  } catch {
    return null;
  }
}

// ============================================
// INDUSTRIES
// ============================================

export async function getAllIndustries(): Promise<{ id: string; name: string; slug: string }[]> {
  return apiFetch<{ id: string; name: string; slug: string }[]>('/industries');
}

export async function getIndustryBySlug(
  slug: string
): Promise<{ id: string; name: string; slug: string } | null> {
  try {
    return await apiFetch<{ id: string; name: string; slug: string }>(
      `/industries/${slug}`
    );
  } catch {
    return null;
  }
}

// ============================================
// PAGE CONTENT
// ============================================

export async function getPageContent(pageKey: string): Promise<ApiPageContent | null> {
  try {
    return await apiFetch<ApiPageContent>(`/pages/${pageKey}`);
  } catch {
    return null;
  }
}

// ============================================
// STATIC PAGE CONTENT
// ============================================

export async function getTeamMembers(category?: string): Promise<ApiTeamMember[]> {
  const query = category ? `?category=${category}` : '';
  return apiFetch<ApiTeamMember[]>(`/team-members${query}`);
}

export async function getCommunityServices(): Promise<ApiCommunityService[]> {
  return apiFetch<ApiCommunityService[]>('/community-services');
}

export async function getFAQs(): Promise<ApiFAQ[]> {
  return apiFetch<ApiFAQ[]>('/faqs');
}

export async function getCoreValues(): Promise<ApiCoreValue[]> {
  return apiFetch<ApiCoreValue[]>('/core-values');
}

export async function getIndustrySectors(): Promise<ApiIndustrySector[]> {
  return apiFetch<ApiIndustrySector[]>('/industry-sectors');
}

export async function getAwards(): Promise<ApiAward[]> {
  return apiFetch<ApiAward[]>('/awards');
}

export async function getServiceOfferings(params?: {
  category?: string;
  type?: string;
}): Promise<ApiServiceOffering[]> {
  const query = new URLSearchParams();
  if (params?.category) query.set('category', params.category);
  if (params?.type) query.set('type', params.type);
  const queryStr = query.toString();
  return apiFetch<ApiServiceOffering[]>(`/service-offerings${queryStr ? `?${queryStr}` : ''}`);
}

// ============================================
// NEWSLETTER
// ============================================

export async function subscribeToNewsletter(email: string, name?: string): Promise<{ success: boolean }> {
  return apiPost<{ success: boolean }>('/subscribe', { email, name, source: 'website' });
}

// ============================================
// SELLER INTAKE
// ============================================

export interface SellerIntakeData {
  firstName: string;
  lastName: string;
  email: string;
  companyName: string;
  phone?: string;
  title?: string;
  industry?: string;
  city?: string;
  state?: string;
  revenueRange?: string;
  employeeCount?: string;
  timeline?: string;
  serviceInterest?: string;
  message?: string;
  source?: string;
  referralSource?: string;
}

export async function submitSellerIntake(
  data: SellerIntakeData
): Promise<{ success: boolean; message: string; id: string }> {
  return apiPost<{ success: boolean; message: string; id: string }>('/seller-intake', data);
}

// ============================================
// ANALYTICS
// ============================================

export async function recordPageView(path: string): Promise<void> {
  try {
    await apiPost<{ success: boolean }>('/analytics/pageview', { path });
  } catch {
    // Silently fail - analytics should not break the page
  }
}

