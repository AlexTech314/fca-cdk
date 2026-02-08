/**
 * Data layer for Next.js
 *
 * Fetches from the API and maps responses to app types (Tombstone, NewsArticle, ResourceArticle).
 */

import type { NewsArticle, ResourceArticle, Tombstone, NewsArticleSummary, TombstoneSummary } from './types';
import { toAssetUrl } from './utils';
import {
  getTombstones as apiGetTombstones,
  getTombstoneBySlug as apiGetTombstoneBySlug,
  getBlogPosts as apiGetBlogPosts,
  getBlogPostBySlug as apiGetBlogPostBySlug,
  getRelatedNewsForTombstone as apiGetRelatedNews,
  getRelatedContentForBlogPost,
  getAllTags,
  getTagBySlug,
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
  return {
    slug: t.slug,
    seller: t.name,
    buyerPeFirm: t.buyerPeFirm,
    buyerPlatform: t.buyerPlatform,
    industry: t.industry || '',
    transactionYear: t.transactionYear || 0,
    city: t.city || '',
    state: t.state || '',
    hasPressRelease: !!t.pressRelease,
    pressReleaseSlug: t.pressRelease?.slug || null,
    imagePath: t.asset?.s3Key ? toAssetUrl(t.asset.s3Key) : undefined,
    tags: (t.tags ?? []).map((tag) => tag.slug),
  };
}

function fromApiBlogPostToNewsArticle(p: ApiBlogPost): NewsArticle {
  return {
    slug: p.slug,
    title: p.title,
    date: p.publishedAt ? formatDate(new Date(p.publishedAt)) : '',
    author: p.author || undefined,
    excerpt: p.excerpt || extractExcerpt(p.content),
    content: p.content,
    url: undefined,
    tags: p.tags.map((tag) => tag.slug),
  };
}

function fromApiBlogPostToResourceArticle(p: ApiBlogPost): ResourceArticle {
  return {
    slug: p.slug,
    title: p.title,
    category: p.category || 'Advice',
    author: p.author || undefined,
    excerpt: p.excerpt || extractExcerpt(p.content),
    content: p.content,
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
 * Get tombstones filtered by industry
 */
export async function getTombstonesByIndustry(industry: string): Promise<Tombstone[]> {
  const response = await apiGetTombstones({ industry, limit: 100 });
  return response.items.map(fromApiTombstone);
}

/**
 * Get tombstones filtered by year
 */
export async function getTombstonesByYear(year: number): Promise<Tombstone[]> {
  const response = await apiGetTombstones({ year, limit: 100 });
  return response.items.map(fromApiTombstone);
}

/**
 * Get tombstones by tag
 */
export async function getTombstonesByTag(tag: string): Promise<Tombstone[]> {
  const response = await apiGetTombstones({ tag, limit: 100 });
  return response.items.map(fromApiTombstone);
}

/**
 * Get tombstones by state
 */
export async function getTombstonesByState(state: string): Promise<Tombstone[]> {
  const response = await apiGetTombstones({ state, limit: 100 });
  return response.items.map(fromApiTombstone);
}

/**
 * Get all unique tags from tombstones
 */
export async function getAllTombstoneTags(): Promise<string[]> {
  const tags = await getAllTags();
  return tags.filter((t) => t.category === 'industry').map((t) => t.slug);
}

/**
 * Get all unique states from tombstones
 */
export async function getAllStates(): Promise<string[]> {
  // Fetch all tombstones and extract unique states
  const tombstones = await getTombstones();
  const stateSet = new Set<string>();

  for (const tombstone of tombstones) {
    if (tombstone.state) {
      const states = tombstone.state.split(/[&\/,]+/).map((s) => s.trim().toUpperCase());
      for (const state of states) {
        if (state.length >= 2) stateSet.add(state);
      }
    }
  }

  return Array.from(stateSet).sort();
}

/**
 * Get all unique cities from tombstones
 */
export async function getAllCities(): Promise<string[]> {
  const tombstones = await getTombstones();
  const citySet = new Set<string>();

  for (const tombstone of tombstones) {
    if (tombstone.city) citySet.add(tombstone.city);
  }

  return Array.from(citySet).sort();
}

/**
 * Get tombstones by city
 */
export async function getTombstonesByCity(city: string): Promise<Tombstone[]> {
  const tombstones = await getTombstones();
  const citySlug = cityToSlug(city);
  return tombstones.filter((t) => cityToSlug(t.city) === citySlug);
}

/**
 * Get all unique transaction years from tombstones
 */
export async function getAllTransactionYears(): Promise<number[]> {
  const tombstones = await getTombstones();
  const yearSet = new Set<number>();

  for (const tombstone of tombstones) {
    if (tombstone.transactionYear && tombstone.transactionYear > 0) {
      yearSet.add(tombstone.transactionYear);
    }
  }

  return Array.from(yearSet).sort((a, b) => b - a);
}

// ============================================
// NEWS ARTICLES
// ============================================

/**
 * Get all news articles
 */
export async function getNewsArticles(): Promise<NewsArticle[]> {
  const response = await apiGetBlogPosts({ category: 'news', limit: 100 });
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
 * Get news articles by tag
 */
export async function getNewsArticlesByTag(tag: string): Promise<NewsArticle[]> {
  const response = await apiGetBlogPosts({ category: 'news', tag, limit: 100 });
  return response.items.map(fromApiBlogPostToNewsArticle);
}

/**
 * Get all unique tags from news articles
 */
export async function getAllNewsTags(): Promise<string[]> {
  const tags = await getAllTags();
  return tags.map((t) => t.slug);
}

/**
 * Get a map of tag slug -> display name for use in client components
 */
export async function getTagNamesMap(): Promise<Record<string, string>> {
  const tags = await getAllTags();
  return Object.fromEntries(tags.map((t) => [t.slug, t.name]));
}

// ============================================
// RESOURCE ARTICLES
// ============================================

/**
 * Get all resource articles
 */
export async function getResourceArticles(): Promise<ResourceArticle[]> {
  const response = await apiGetBlogPosts({ category: 'resource', limit: 100 });
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
      excerpt: article.excerpt || extractExcerpt(article.content),
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
      excerpt: a.excerpt || extractExcerpt(a.content),
    }));
}

/**
 * Get adjacent articles for navigation
 */
export async function getAdjacentArticles(
  currentSlug: string
): Promise<{ prev: NewsArticleSummary; next: NewsArticleSummary }> {
  const allNews = await getNewsArticles();
  const currentIndex = allNews.findIndex((a) => a.slug === currentSlug);

  const prevIndex = currentIndex === 0 ? allNews.length - 1 : currentIndex - 1;
  const nextIndex = currentIndex === allNews.length - 1 ? 0 : currentIndex + 1;

  const prevArticle = allNews[prevIndex];
  const nextArticle = allNews[nextIndex];

  return {
    prev: {
      slug: prevArticle.slug,
      title: prevArticle.title,
      date: prevArticle.date,
      excerpt: prevArticle.excerpt,
    },
    next: {
      slug: nextArticle.slug,
      title: nextArticle.title,
      date: nextArticle.date,
      excerpt: nextArticle.excerpt,
    },
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
