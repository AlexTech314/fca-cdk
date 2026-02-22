/**
 * Data layer for Next.js
 *
 * Fetches from the API and maps responses to app types (Tombstone, NewsArticle, ResourceArticle).
 */

import { cache } from 'react';
import type { NewsArticle, ResourceArticle, Tombstone, NewsArticleSummary, TombstoneSummary } from './types';
import { toAssetUrl } from './utils';
import {
  getTombstones as apiGetTombstones,
  getTombstoneBySlug as apiGetTombstoneBySlug,
  getTombstoneFilters,
  getAdjacentBlogPosts,
  getBlogPosts as apiGetBlogPosts,
  getBlogPostBySlug as apiGetBlogPostBySlug,
  getRelatedNewsForTombstone as apiGetRelatedNews,
  getRelatedContentForBlogPost,
  getAllIndustries,
  getNewsIndustries,
  getIndustryBySlug,
  getPageContent,
  getTeamMembers,
  getCommunityServices,
  getFAQs,
  getCoreValues,
  getIndustrySectors,
  getServiceOfferings,
  type ApiTombstone,
  type ApiBlogPost,
  type ApiPageContent,
  type ApiTeamMember,
  type ApiCommunityService,
  type ApiFAQ,
  type ApiCoreValue,
  type ApiIndustrySector,
  type ApiServiceOffering,
} from './api';

// ============================================
// API → APP TYPE MAPPERS
// ============================================

function fromApiTombstone(t: ApiTombstone): Tombstone {
  const locationStates = (t.locationStates ?? []).map((s) => ({ id: s.id, name: s.name }));
  const locationCities = (t.locationCities ?? []).map((c) => ({
    id: c.id, name: c.name, stateId: c.stateId, stateName: c.stateName,
  }));
  return {
    slug: t.slug,
    seller: t.name,
    buyerPeFirm: t.buyerPeFirm,
    buyerPlatform: t.buyerPlatform,
    industries: (t.industries ?? []).map((i) => ({ id: i.id, name: i.name, slug: i.slug })),
    transactionYear: t.transactionYear || 0,
    locationStates,
    locationCities,
    hasPressRelease: !!t.pressRelease,
    pressReleaseSlug: t.pressRelease?.slug || null,
    imagePath: t.asset?.s3Key ? toAssetUrl(t.asset.s3Key) : undefined,
  };
}

function fromApiBlogPostToNewsArticle(p: ApiBlogPost): NewsArticle {
  return {
    slug: p.slug,
    title: p.title,
    date: p.publishedAt ? formatDate(new Date(p.publishedAt)) : '',
    author: p.author || undefined,
    excerpt: p.excerpt || extractExcerpt((p as { content?: string }).content || ''),
    content: (p as { content?: string }).content ?? '',
    url: undefined,
    industries: (p.industries ?? []).map((i) => ({ id: i.id, name: i.name, slug: i.slug })),
  };
}

function fromApiBlogPostToResourceArticle(p: ApiBlogPost): ResourceArticle {
  return {
    slug: p.slug,
    title: p.title,
    category: p.category || 'Advice',
    author: p.author || undefined,
    excerpt: p.excerpt || extractExcerpt((p as { content?: string }).content || ''),
    content: (p as { content?: string }).content ?? '',
  };
}

/**
 * Extract first paragraph as excerpt
 */
function extractExcerpt(content: string): string {
  const firstPara = content.split('\n\n')[0]?.replace(/^#+\s*/, '').trim() || '';
  return firstPara.slice(0, 200) + (firstPara.length > 200 ? '...' : '');
}

/**
 * Format date as "Month YYYY"
 */
function formatDate(date: Date): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

/**
 * Parse date string like "December 2025" or "January 2024"
 */
function parseDate(dateStr: string): Date {
  if (!dateStr) return new Date(0);

  const months: Record<string, number> = {
    january: 0, february: 1, march: 2, april: 3,
    may: 4, june: 5, july: 6, august: 7,
    september: 8, october: 9, november: 10, december: 11,
  };

  const parts = dateStr.toLowerCase().split(' ');
  const month = months[parts[0]] ?? 0;
  const year = parseInt(parts[1]) || 2024;

  return new Date(year, month, 1);
}

// ============================================
// TOMBSTONES
// ============================================

/**
 * Get all tombstones
 */
export async function getTombstones(): Promise<Tombstone[]> {
  const response = await apiGetTombstones({ limit: 200 });
  return response.items.map(fromApiTombstone);
}

/**
 * Get a single tombstone by slug
 */
export async function getTombstone(slug: string): Promise<Tombstone | null> {
  const tombstone = await apiGetTombstoneBySlug(slug);
  return tombstone ? fromApiTombstone(tombstone) : null;
}

/**
 * Get tombstones filtered by industry slug (request-scoped cache for metadata + page deduplication)
 */
export const getTombstonesByIndustry = cache(async (slug: string): Promise<Tombstone[]> => {
  const response = await apiGetTombstones({ industry: slug, limit: 100 });
  return response.items.map(fromApiTombstone);
});

/**
 * Get tombstones filtered by year (request-scoped cache for metadata + page deduplication)
 */
export const getTombstonesByYear = cache(async (year: number): Promise<Tombstone[]> => {
  const response = await apiGetTombstones({ year, limit: 100 });
  return response.items.map(fromApiTombstone);
});

/**
 * Get tombstones by state (request-scoped cache for metadata + page deduplication)
 */
export const getTombstonesByState = cache(async (state: string): Promise<Tombstone[]> => {
  const response = await apiGetTombstones({ state, limit: 100 });
  return response.items.map(fromApiTombstone);
});

/**
 * Get tombstone filter options (states, cities, years, tags) in a single API call
 */
export async function getTombstoneFilterOptions() {
  return getTombstoneFilters();
}

/**
 * Get tombstones by city (request-scoped cache for metadata + page deduplication).
 * Pass URL slug (e.g. "denver") or display name (e.g. "Denver").
 */
export const getTombstonesByCity = cache(async (citySlugOrName: string): Promise<Tombstone[]> => {
  const cityName = citySlugOrName.includes('-') ? slugToCity(citySlugOrName) : citySlugOrName;
  const response = await apiGetTombstones({ city: cityName, limit: 100 });
  return response.items.map(fromApiTombstone);
});

// ============================================
// NEWS ARTICLES
// ============================================

/**
 * Get news articles (optionally limited)
 */
export async function getNewsArticles(limit = 100): Promise<NewsArticle[]> {
  const response = await apiGetBlogPosts({ category: 'news', limit });
  return response.items.map(fromApiBlogPostToNewsArticle);
}

/**
 * Get a single news article by slug
 */
export async function getNewsArticle(slug: string): Promise<NewsArticle | null> {
  const post = await apiGetBlogPostBySlug(slug);
  if (!post || post.category !== 'news') return null;
  return fromApiBlogPostToNewsArticle(post);
}

/**
 * Get news articles by industry slug (request-scoped cache for metadata + page deduplication)
 */
export const getNewsArticlesByIndustry = cache(async (slug: string): Promise<NewsArticle[]> => {
  const response = await apiGetBlogPosts({ category: 'news', industry: slug, limit: 100 });
  return response.items.map(fromApiBlogPostToNewsArticle);
});

/**
 * Get industries that have at least one news article (for ContentExplorer - only show clickable topics with content)
 */
export async function getAllNewsIndustries(): Promise<{ id: string; name: string; slug: string }[]> {
  return getNewsIndustries();
}

/**
 * Get a map of industry slug -> display name for use in client components
 */
export async function getIndustryNamesMap(): Promise<Record<string, string>> {
  const industries = await getAllIndustries();
  return Object.fromEntries(industries.map((i) => [i.slug, i.name]));
}

// ============================================
// RESOURCE ARTICLES
// ============================================

/**
 * Get resource articles (optionally limited)
 */
export async function getResourceArticles(limit = 100): Promise<ResourceArticle[]> {
  const response = await apiGetBlogPosts({ category: 'resource', limit });
  return response.items.map(fromApiBlogPostToResourceArticle);
}

/**
 * Get a single resource article by slug
 */
export async function getResourceArticle(slug: string): Promise<ResourceArticle | null> {
  const post = await apiGetBlogPostBySlug(slug);
  if (!post || post.category !== 'resource') return null;
  return fromApiBlogPostToResourceArticle(post);
}

// ============================================
// RELATED CONTENT
// ============================================

/**
 * Find the press release for a tombstone
 */
export async function findPressReleaseForTombstone(tombstone: Tombstone): Promise<NewsArticle | null> {
  if (!tombstone.hasPressRelease || !tombstone.pressReleaseSlug) return null;
  return getNewsArticle(tombstone.pressReleaseSlug);
}

/**
 * Get related news articles for a tombstone (excludes press release)
 */
export async function getRelatedNewsForTombstone(
  tombstone: Tombstone,
  pressReleaseSlug: string | null
): Promise<NewsArticleSummary[]> {
  const related = await apiGetRelatedNews(tombstone.slug);

  return related
    .filter(
      (article) =>
        article.slug !== pressReleaseSlug && (article.category || '').toLowerCase() === 'news'
    )
    .slice(0, 5)
    .map((article) => ({
      slug: article.slug,
      title: article.title,
      date: article.publishedAt ? formatDate(new Date(article.publishedAt)) : '',
      excerpt: article.excerpt || extractExcerpt((article as { content?: string }).content || ''),
    }));
}

/**
 * Get related tombstones for a news article
 */
export async function getRelatedTombstonesForNews(article: NewsArticle): Promise<Tombstone[]> {
  const { tombstones } = await getRelatedContentForBlogPost(article.slug);
  return tombstones.slice(0, 6).map(fromApiTombstone);
}

/**
 * Get related news articles from tombstones (single batch query by industry slugs).
 * Deduplicates by slug and sorts by date descending.
 */
export async function getRelatedNewsFromTombstones(
  tombstones: { industries?: { id: string; name: string; slug: string }[] }[]
): Promise<NewsArticle[]> {
  const uniqueSlugs = [...new Set(tombstones.flatMap((t) => (t.industries || []).map((i) => i.slug)))];
  if (uniqueSlugs.length === 0) return [];

  const response = await apiGetBlogPosts({
    category: 'news',
    industries: uniqueSlugs.join(','),
    limit: 50,
  });
  const seenSlugs = new Set<string>();
  const relatedNews: NewsArticle[] = [];
  for (const article of response.items) {
    if (!seenSlugs.has(article.slug)) {
      seenSlugs.add(article.slug);
      relatedNews.push(fromApiBlogPostToNewsArticle(article));
    }
  }
  relatedNews.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  return relatedNews;
}

/**
 * Get related news articles for a news article
 */
export async function getRelatedNewsForNews(article: NewsArticle): Promise<NewsArticleSummary[]> {
  const { articles } = await getRelatedContentForBlogPost(article.slug);

  return articles
    .filter(
      (a) => a.slug !== article.slug && (a.category || '').toLowerCase() === 'news'
    )
    .slice(0, 4)
    .map((a) => ({
      slug: a.slug,
      title: a.title,
      date: a.publishedAt ? formatDate(new Date(a.publishedAt)) : '',
      excerpt: a.excerpt || extractExcerpt((a as { content?: string }).content || ''),
    }));
}

/**
 * Get adjacent articles for navigation (prev/next with wrap-around)
 */
export async function getAdjacentArticles(
  currentSlug: string
): Promise<{ prev: NewsArticleSummary | null; next: NewsArticleSummary | null }> {
  const result = await getAdjacentBlogPosts(currentSlug);
  if (!result) return { prev: null, next: null };
  return {
    prev: result.prev
      ? {
          slug: result.prev.slug,
          title: result.prev.title,
          date: result.prev.publishedAt ? formatDate(new Date(result.prev.publishedAt)) : '',
          excerpt: '',
        }
      : null,
    next: result.next
      ? {
          slug: result.next.slug,
          title: result.next.title,
          date: result.next.publishedAt ? formatDate(new Date(result.next.publishedAt)) : '',
          excerpt: '',
        }
      : null,
  };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Convert city name to URL-friendly slug
 */
export function cityToSlug(city: string): string {
  return city
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Convert slug back to city display name
 */
export function slugToCity(slug: string): string {
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Convert markdown content to sections
 */
export function parseMarkdownContent(content: string): string[] {
  return content
    .split(/\n\n+/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0);
}

// ============================================
// STATIC PAGE CONTENT
// ============================================

/**
 * Get page content by key with fallback handling.
 * Returns null if the page doesn't exist.
 */
export async function getPageData(pageKey: string): Promise<ApiPageContent | null> {
  return getPageContent(pageKey);
}

/**
 * Get all team members split by category.
 */
export async function getTeamMembersByCategory(): Promise<{
  leadership: ApiTeamMember[];
  analysts: ApiTeamMember[];
}> {
  try {
    const [leadership, analysts] = await Promise.all([
      getTeamMembers('leadership'),
      getTeamMembers('analyst'),
    ]);
    const mapTeam = (members: ApiTeamMember[]) =>
      members.map((member) => ({
        ...member,
        image: toAssetUrl(member.image) || member.image,
      }));
    return { leadership: mapTeam(leadership), analysts: mapTeam(analysts) };
  } catch {
    return { leadership: [], analysts: [] };
  }
}

/**
 * Get all published FAQs.
 */
export async function getAllFAQs(): Promise<ApiFAQ[]> {
  try {
    return await getFAQs();
  } catch {
    return [];
  }
}

/**
 * Get all published core values.
 */
export async function getAllCoreValues(): Promise<ApiCoreValue[]> {
  try {
    const values = await getCoreValues();
    return values.map((value) => ({
      ...value,
      icon: toAssetUrl(value.icon) || value.icon,
    }));
  } catch {
    return [];
  }
}

/**
 * Get all published industry sectors.
 */
export async function getAllIndustrySectors(): Promise<ApiIndustrySector[]> {
  try {
    return await getIndustrySectors();
  } catch {
    return [];
  }
}

/**
 * Get service offerings by category and optional type.
 */
export async function getServicesByCategory(
  category: string,
  type?: string
): Promise<ApiServiceOffering[]> {
  try {
    return await getServiceOfferings({ category, type });
  } catch {
    return [];
  }
}

/**
 * Get all published community services.
 */
export async function getAllCommunityServices(): Promise<ApiCommunityService[]> {
  try {
    return await getCommunityServices();
  } catch {
    return [];
  }
}

// Re-export types for page components
export type {
  ApiPageContent,
  ApiTeamMember,
  ApiCommunityService,
  ApiFAQ,
  ApiCoreValue,
  ApiIndustrySector,
  ApiServiceOffering,
};
