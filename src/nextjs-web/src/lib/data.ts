import fs from 'fs';
import path from 'path';
import type { NewsArticle, ResourceArticle, Tombstone, NewsArticleSummary, TombstoneSummary } from './types';
import { tombstoneImages } from './tombstones';
import { getTombstoneTags, getArticleTags } from './taxonomy';

const dataDir = path.join(process.cwd(), 'data');
const tombstonesPath = path.join(process.cwd(), 'tombstones.csv');

/**
 * Generate a press release slug from the title/link in CSV
 */
function pressReleaseLinkToSlug(link: string | null): string | null {
  if (!link) return null;
  
  // Convert the press release link text to a potential slug
  // This is a heuristic - in production, this would be a proper ID reference
  return link
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

/**
 * Parse frontmatter-like metadata from markdown content
 */
function parseMarkdownMetadata(content: string): {
  metadata: Record<string, string>;
  body: string;
} {
  const lines = content.split('\n');
  const metadata: Record<string, string> = {};
  let bodyStartIndex = 0;

  // Parse header metadata (Title, URL, Author, Date, Category patterns)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip the main title (# heading)
    if (line.startsWith('# ')) {
      metadata.title = line.replace('# ', '').replace(' - Flatirons Capital Advisors', '').trim();
      continue;
    }
    
    // Parse **Key:** Value patterns
    const metaMatch = line.match(/^\*\*([^:]+):\*\*\s*(.+)$/);
    if (metaMatch) {
      const key = metaMatch[1].toLowerCase().replace(/\s+/g, '_');
      metadata[key] = metaMatch[2].trim();
      continue;
    }
    
    // Stop at first --- separator after metadata
    if (line === '---' && Object.keys(metadata).length > 0) {
      bodyStartIndex = i + 1;
      break;
    }
  }

  // Get body content (everything after the first ---)
  const body = lines.slice(bodyStartIndex).join('\n').trim();

  return { metadata, body };
}

/**
 * Create a slug from a filename
 */
function fileNameToSlug(fileName: string): string {
  return fileName.replace('.md', '');
}


/**
 * Get all news articles
 */
export async function getNewsArticles(): Promise<NewsArticle[]> {
  const newsDir = path.join(dataDir, 'news');
  
  if (!fs.existsSync(newsDir)) {
    return [];
  }

  const files = fs.readdirSync(newsDir).filter((f) => f.endsWith('.md'));
  
  const articles: NewsArticle[] = files.map((fileName) => {
    const filePath = path.join(newsDir, fileName);
    const content = fs.readFileSync(filePath, 'utf-8');
    const { metadata, body } = parseMarkdownMetadata(content);
    
    // Extract first paragraph as excerpt
    const bodyLines = body.split('\n\n');
    const excerpt = bodyLines[0]?.replace(/^#+\s*/, '').trim() || '';
    
    const title = metadata.title || fileName.replace('.md', '').replace(/-/g, ' ');

    return {
      slug: fileNameToSlug(fileName),
      title,
      date: metadata.date || '',
      author: metadata.author,
      excerpt: excerpt.slice(0, 200) + (excerpt.length > 200 ? '...' : ''),
      content: body,
      url: metadata.url,
      tags: getArticleTags(title, body),
    };
  });

  // Sort by date (most recent first) - parse "Month YYYY" format
  return articles.sort((a, b) => {
    const dateA = parseDate(a.date);
    const dateB = parseDate(b.date);
    return dateB.getTime() - dateA.getTime();
  });
}

/**
 * Get a single news article by slug
 */
export async function getNewsArticle(slug: string): Promise<NewsArticle | null> {
  const articles = await getNewsArticles();
  return articles.find((a) => a.slug === slug) || null;
}

/**
 * Get all resource articles
 */
export async function getResourceArticles(): Promise<ResourceArticle[]> {
  const articlesDir = path.join(dataDir, 'articles');
  
  if (!fs.existsSync(articlesDir)) {
    return [];
  }

  const files = fs.readdirSync(articlesDir).filter((f) => f.endsWith('.md'));
  
  const articles: ResourceArticle[] = files.map((fileName) => {
    const filePath = path.join(articlesDir, fileName);
    const content = fs.readFileSync(filePath, 'utf-8');
    const { metadata, body } = parseMarkdownMetadata(content);
    
    // Extract first paragraph as excerpt
    const bodyLines = body.split('\n\n');
    const excerpt = bodyLines[0]?.replace(/^#+\s*/, '').trim() || '';

    return {
      slug: fileNameToSlug(fileName),
      title: metadata.title || fileName.replace('.md', '').replace(/-/g, ' '),
      category: metadata.category || 'Advice',
      author: metadata.author || 'Flatirons Capital Advisors',
      excerpt: excerpt.slice(0, 200) + (excerpt.length > 200 ? '...' : ''),
      content: body,
    };
  });

  return articles;
}

/**
 * Get a single resource article by slug
 */
export async function getResourceArticle(slug: string): Promise<ResourceArticle | null> {
  const articles = await getResourceArticles();
  return articles.find((a) => a.slug === slug) || null;
}

/**
 * Generate a URL-friendly slug from seller name
 */
function sellerToSlug(seller: string): string {
  return seller
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Find matching tombstone image from the tombstoneImages mapping
 */
function findTombstoneImage(seller: string): string | undefined {
  // Try exact match first
  if (tombstoneImages[seller]) {
    return tombstoneImages[seller];
  }
  
  // Try fuzzy matching - find key that contains seller name or vice versa
  const sellerLower = seller.toLowerCase();
  for (const [key, imagePath] of Object.entries(tombstoneImages)) {
    const keyLower = key.toLowerCase();
    if (keyLower.includes(sellerLower) || sellerLower.includes(keyLower)) {
      return imagePath;
    }
  }
  
  return undefined;
}

/**
 * Parse CSV content into array of objects
 */
function parseCSV(content: string): Record<string, string>[] {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim());
  const rows: Record<string, string>[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    // Handle CSV with quoted fields containing commas
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] || '';
    });
    rows.push(row);
  }
  
  return rows;
}

/**
 * Get all tombstones from CSV
 */
export async function getTombstones(): Promise<Tombstone[]> {
  if (!fs.existsSync(tombstonesPath)) {
    return [];
  }

  const content = fs.readFileSync(tombstonesPath, 'utf-8');
  const rows = parseCSV(content);
  
  const tombstones: Tombstone[] = rows
    .filter(row => row.seller && row.seller.trim())
    .map((row) => ({
      slug: sellerToSlug(row.seller),
      seller: row.seller,
      buyerPeFirm: row.buyer_pe_firm || null,
      buyerPlatform: row.buyer_platform || null,
      industry: row.industry || '',
      transactionYear: parseInt(row.transaction_year) || 0,
      city: row.city || '',
      state: row.state || '',
      hasPressRelease: row.has_press_release === 'Y',
      pressReleaseSlug: pressReleaseLinkToSlug(row.press_release_link),
      imagePath: findTombstoneImage(row.seller),
      tags: getTombstoneTags(row.industry || '', row.keywords || ''),
    }));

  // Sort by transaction year (most recent first), then by seller name
  return tombstones.sort((a, b) => {
    if (b.transactionYear !== a.transactionYear) {
      return b.transactionYear - a.transactionYear;
    }
    return a.seller.localeCompare(b.seller);
  });
}

/**
 * Get a single tombstone by slug
 */
export async function getTombstone(slug: string): Promise<Tombstone | null> {
  const tombstones = await getTombstones();
  return tombstones.find((t) => t.slug === slug) || null;
}

/**
 * Get tombstones filtered by industry
 */
export async function getTombstonesByIndustry(industry: string): Promise<Tombstone[]> {
  const tombstones = await getTombstones();
  return tombstones.filter((t) => 
    t.industry.toLowerCase().includes(industry.toLowerCase())
  );
}

/**
 * Get tombstones filtered by year
 */
export async function getTombstonesByYear(year: number): Promise<Tombstone[]> {
  const tombstones = await getTombstones();
  return tombstones.filter((t) => t.transactionYear === year);
}

/**
 * Find the press release for a tombstone by matching seller name in article titles/content
 */
export async function findPressReleaseForTombstone(tombstone: Tombstone): Promise<NewsArticle | null> {
  if (!tombstone.hasPressRelease) return null;
  
  const allNews = await getNewsArticles();
  const sellerWords = tombstone.seller.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  
  // Find best matching article
  const matches = allNews.filter((article) => {
    const titleLower = article.title.toLowerCase();
    const contentLower = article.content.toLowerCase();
    
    return sellerWords.some((word) => 
      titleLower.includes(word) || contentLower.includes(word)
    );
  });
  
  // Return first match (could improve with better scoring)
  return matches[0] || null;
}

/**
 * Get related news articles for a tombstone by matching tags (excludes press release)
 */
export async function getRelatedNewsForTombstone(
  tombstone: Tombstone, 
  pressReleaseSlug: string | null
): Promise<NewsArticleSummary[]> {
  const allNews = await getNewsArticles();
  
  // Find articles that share tags with the tombstone
  const related = allNews
    .filter((article) => {
      // Exclude the press release itself
      if (article.slug === pressReleaseSlug) return false;
      
      // Check for overlapping tags
      return article.tags.some((tag) => tombstone.tags.includes(tag));
    })
    .slice(0, 5); // Limit to 5 related articles
  
  return related.map((article) => ({
    slug: article.slug,
    title: article.title,
    date: article.date,
    excerpt: article.excerpt,
  }));
}

/**
 * Get related tombstones for a news article by matching tags
 */
export async function getRelatedTombstonesForNews(article: NewsArticle): Promise<TombstoneSummary[]> {
  const allTombstones = await getTombstones();
  
  // Find tombstones that share tags with the article
  const related = allTombstones
    .filter((tombstone) => {
      return tombstone.tags.some((tag) => article.tags.includes(tag));
    })
    .slice(0, 6); // Limit to 6 related tombstones
  
  return related.map((tombstone) => ({
    slug: tombstone.slug,
    seller: tombstone.seller,
    industry: tombstone.industry,
    transactionYear: tombstone.transactionYear,
  }));
}

/**
 * Get related news articles for a news article by matching tags
 */
export async function getRelatedNewsForNews(
  article: NewsArticle
): Promise<NewsArticleSummary[]> {
  const allNews = await getNewsArticles();
  
  const related = allNews
    .filter((other) => {
      // Exclude the article itself
      if (other.slug === article.slug) return false;
      
      // Check for overlapping tags
      return other.tags.some((tag) => article.tags.includes(tag));
    })
    .slice(0, 4); // Limit to 4 related articles
  
  return related.map((a) => ({
    slug: a.slug,
    title: a.title,
    date: a.date,
    excerpt: a.excerpt,
  }));
}

/**
 * Get adjacent articles (previous and next) for navigation
 * Articles are sorted by date (newest first)
 * Loops: if first article, prev = last; if last article, next = first
 */
export async function getAdjacentArticles(
  currentSlug: string
): Promise<{ prev: NewsArticleSummary; next: NewsArticleSummary }> {
  const allNews = await getNewsArticles(); // Already sorted by date (newest first)
  
  const currentIndex = allNews.findIndex((a) => a.slug === currentSlug);
  
  // Calculate prev/next indices with looping
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

/**
 * Convert markdown content to HTML-safe sections
 */
export function parseMarkdownContent(content: string): string[] {
  // Split by headings and paragraphs
  return content
    .split(/\n\n+/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0);
}

// ============================================
// SEO Content Grouping Functions
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
 * Convert slug back to city display name (capitalize words)
 */
export function slugToCity(slug: string): string {
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Get all unique tags from tombstones
 */
export async function getAllTombstoneTags(): Promise<string[]> {
  const tombstones = await getTombstones();
  const tagSet = new Set<string>();
  
  for (const tombstone of tombstones) {
    for (const tag of tombstone.tags) {
      if (tag) tagSet.add(tag);
    }
  }
  
  return Array.from(tagSet).sort();
}

/**
 * Get tombstones by tag
 */
export async function getTombstonesByTag(tag: string): Promise<Tombstone[]> {
  const tombstones = await getTombstones();
  return tombstones.filter((t) => t.tags.includes(tag));
}

/**
 * Parse state codes from a raw state string (handles multi-state like "PA & MD")
 */
function parseStates(rawState: string): string[] {
  if (!rawState) return [];
  
  // Split on common separators: &, /, ,
  const parts = rawState.split(/[&\/,]+/).map(s => s.trim().toUpperCase());
  
  // Filter to valid 2-letter state codes or known values like "CANADA"
  return parts.filter(s => s.length >= 2 && s.length <= 10);
}

/**
 * Get all unique states from tombstones
 */
export async function getAllStates(): Promise<string[]> {
  const tombstones = await getTombstones();
  const stateSet = new Set<string>();
  
  for (const tombstone of tombstones) {
    if (tombstone.state) {
      // Parse multi-state entries
      const states = parseStates(tombstone.state);
      for (const state of states) {
        stateSet.add(state);
      }
    }
  }
  
  return Array.from(stateSet).sort();
}

/**
 * Get tombstones by state
 */
export async function getTombstonesByState(state: string): Promise<Tombstone[]> {
  const tombstones = await getTombstones();
  const normalizedState = state.toUpperCase();
  
  return tombstones.filter((t) => {
    const states = parseStates(t.state);
    return states.includes(normalizedState);
  });
}

/**
 * Get all unique cities from tombstones
 */
export async function getAllCities(): Promise<string[]> {
  const tombstones = await getTombstones();
  const citySet = new Set<string>();
  
  for (const tombstone of tombstones) {
    if (tombstone.city) {
      citySet.add(tombstone.city);
    }
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
  
  return Array.from(yearSet).sort((a, b) => b - a); // Descending order
}

/**
 * Get all unique tags from news articles
 */
export async function getAllNewsTags(): Promise<string[]> {
  const articles = await getNewsArticles();
  const tagSet = new Set<string>();
  
  for (const article of articles) {
    for (const tag of article.tags) {
      if (tag) tagSet.add(tag);
    }
  }
  
  return Array.from(tagSet).sort();
}

/**
 * Get news articles by tag
 */
export async function getNewsArticlesByTag(tag: string): Promise<NewsArticle[]> {
  const articles = await getNewsArticles();
  return articles.filter((a) => a.tags.includes(tag));
}
