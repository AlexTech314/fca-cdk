import fs from 'fs';
import path from 'path';
import type { NewsArticle, ResourceArticle } from './types';

const dataDir = path.join(process.cwd(), 'data');

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

    return {
      slug: fileNameToSlug(fileName),
      title: metadata.title || fileName.replace('.md', '').replace(/-/g, ' '),
      date: metadata.date || '',
      author: metadata.author,
      excerpt: excerpt.slice(0, 200) + (excerpt.length > 200 ? '...' : ''),
      content: body,
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
