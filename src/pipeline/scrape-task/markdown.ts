/**
 * Convert scraped HTML pages to markdown and upload to S3.
 * Uploads both individual per-page files and a combined file for scoring.
 */

import { createHash } from 'crypto';
import TurndownService from 'turndown';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import type { ScrapedPage } from './types.js';
import { s3Client, CAMPAIGN_DATA_BUCKET } from './config.js';

const MAX_MARKDOWN_CHARS = 60_000;

const PRIORITY_PATHS = ['about', 'team', 'staff', 'leadership', 'contact', 'services', 'our-story'];

/** URL path patterns that produce non-content pages (API endpoints, feeds, etc.) */
const SKIP_URL_PATTERNS = [
  '/wp-json', '/feed', '/xmlrpc', '/sitemap', '/.well-known',
  '/wp-admin', '/wp-login', '/wp-includes', '/wp-content/plugins',
];

function getPagePriority(url: string): number {
  const lower = url.toLowerCase();
  for (let i = 0; i < PRIORITY_PATHS.length; i++) {
    if (lower.includes(PRIORITY_PATHS[i])) return i;
  }
  return PRIORITY_PATHS.length;
}

/** Check if a page URL points to a non-content endpoint */
function isJunkUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return SKIP_URL_PATTERNS.some((p) => lower.includes(p));
}

/** Check if HTML content is actually JSON (e.g. WP REST API) */
function isJsonContent(html: string): boolean {
  const trimmed = html.trimStart();
  return trimmed.startsWith('{') || trimmed.startsWith('[');
}

/** Elements for Turndown to remove entirely (content + tags) via DOM parsing */
const REMOVE_ELEMENTS = [
  'script', 'style', 'noscript', 'svg', 'iframe',
  'figure', 'figcaption', 'picture', 'video', 'audio', 'canvas',
  'form', 'button', 'input', 'select', 'textarea',
  'nav', 'header', 'footer', 'aside',
  'link', 'meta',
];

function urlHash(url: string): string {
  return createHash('sha256').update(url).digest('hex').slice(0, 12);
}

/** Clean markdown output: strip image refs, nav artifacts, collapse whitespace */
function cleanMarkdown(md: string): string {
  return md
    // Remove image markdown that Turndown's built-in rule converts before remove() runs
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    // Remove "Skip to content" and similar anchor-only links
    .replace(/\[Skip to [^\]]*\]\(#[^)]*\)/gi, '')
    // Collapse 3+ consecutive newlines to 2
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Detect repeated boilerplate across pages and return it for stripping.
 * Finds the longest common trailing block (e.g. footer contact section)
 * that appears in the majority of pages.
 */
function findRepeatedTrailingBlock(markdowns: string[], minPages: number): string | null {
  if (markdowns.length < minPages) return null;

  // Split each markdown into paragraph-level blocks (separated by double-newline)
  const allBlocks = markdowns.map((md) =>
    md.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean)
  );

  // Walk backwards from the end, checking how many pages share the same trailing blocks
  let trailingCount = 0;
  outer: for (let offset = 1; offset <= 20; offset++) {
    const candidates = allBlocks
      .filter((blocks) => blocks.length >= offset)
      .map((blocks) => blocks[blocks.length - offset]);

    if (candidates.length < minPages) break;

    // Check if the majority share the same block at this offset
    const counts = new Map<string, number>();
    for (const c of candidates) {
      counts.set(c, (counts.get(c) ?? 0) + 1);
    }
    const maxCount = Math.max(...counts.values());
    if (maxCount >= minPages) {
      trailingCount = offset;
    } else {
      break outer;
    }
  }

  if (trailingCount === 0) return null;

  // Build the repeated block from the first page that has enough blocks
  const refBlocks = allBlocks.find((b) => b.length >= trailingCount);
  if (!refBlocks) return null;

  return refBlocks.slice(refBlocks.length - trailingCount).join('\n\n');
}

function convertPageToMarkdown(page: ScrapedPage): string {
  const turndown = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
  });

  // Use Turndown's built-in DOM-based element removal (much more reliable than regex)
  turndown.remove(REMOVE_ELEMENTS);

  // Override built-in image rule (Turndown's remove() doesn't override built-in rules)
  turndown.addRule('removeImages', {
    filter: 'img',
    replacement: () => '',
  });

  let md: string;
  try {
    md = turndown.turndown(page.html);
  } catch {
    md = page.text_content;
  }

  return cleanMarkdown(md);
}

/** Hash the first 2000 chars of content for near-duplicate detection */
function contentFingerprint(md: string): string {
  // Normalize whitespace for comparison
  const normalized = md.replace(/\s+/g, ' ').trim().slice(0, 2000);
  return createHash('sha256').update(normalized).digest('hex');
}

export interface MarkdownUploadResult {
  /** S3 key for the combined markdown file (for scoring) */
  combinedS3Key: string;
  /** Map of page URL -> S3 key for individual page markdown */
  pageMarkdownKeys: Map<string, string>;
}

/**
 * Convert scraped pages to markdown and upload to S3.
 * Uploads individual per-page files + a combined file for scoring.
 */
export async function convertAndUploadMarkdown(
  pages: ScrapedPage[],
  leadId: string,
  scrapeRunId: string,
): Promise<MarkdownUploadResult> {
  const pageMarkdownKeys = new Map<string, string>();

  // Filter out junk pages (API endpoints, JSON responses, etc.)
  const validPages = pages.filter((page) => {
    if (isJunkUrl(page.url)) return false;
    if (isJsonContent(page.html)) return false;
    return true;
  });

  // Sort pages: priority pages first, then by URL
  const sorted = [...validPages].sort((a, b) => {
    const pa = getPagePriority(a.url);
    const pb = getPagePriority(b.url);
    if (pa !== pb) return pa - pb;
    return a.url.localeCompare(b.url);
  });

  // Convert all pages to markdown (used for both individual uploads and combined)
  const pageMarkdowns = new Map<ScrapedPage, string>();
  for (const page of sorted) {
    const md = convertPageToMarkdown(page);
    if (md) pageMarkdowns.set(page, md);
  }

  // Upload individual per-page markdown files
  const uploadPromises: Promise<void>[] = [];
  for (const [page, md] of pageMarkdowns) {
    const hash = urlHash(page.url);
    const pageS3Key = `scrape-markdown/${leadId}/${scrapeRunId}/${hash}.md`;
    pageMarkdownKeys.set(page.url, pageS3Key);

    uploadPromises.push(
      s3Client.send(new PutObjectCommand({
        Bucket: CAMPAIGN_DATA_BUCKET,
        Key: pageS3Key,
        Body: md,
        ContentType: 'text/markdown',
      })).then(() => {})
    );
  }

  // Detect and strip repeated trailing boilerplate (e.g. contact footer on every page)
  const allMds = [...pageMarkdowns.values()];
  const minPagesForBoilerplate = Math.max(3, Math.floor(allMds.length * 0.6));
  const boilerplate = findRepeatedTrailingBlock(allMds, minPagesForBoilerplate);

  // Build combined markdown for scoring (with char limit and deduplication)
  const parts: string[] = [];
  let totalLength = 0;
  const seenFingerprints = new Set<string>();

  for (const page of sorted) {
    if (totalLength >= MAX_MARKDOWN_CHARS) break;

    let md = pageMarkdowns.get(page);
    if (!md) continue;

    // Skip near-duplicate pages
    const fp = contentFingerprint(md);
    if (seenFingerprints.has(fp)) continue;
    seenFingerprints.add(fp);

    // Strip repeated boilerplate from each page in the combined output
    if (boilerplate && md.endsWith(boilerplate)) {
      md = md.slice(0, -boilerplate.length).trimEnd();
    }

    if (!md) continue;

    const header = `# ${page.title || 'Untitled'}\nSource: ${page.url}\n---\n`;
    const section = header + md + '\n\n';

    const remaining = MAX_MARKDOWN_CHARS - totalLength;
    if (section.length > remaining) {
      parts.push(section.slice(0, remaining));
      totalLength += remaining;
      break;
    }

    parts.push(section);
    totalLength += section.length;
  }

  const combinedMarkdown = parts.join('');
  const combinedS3Key = `scrape-markdown/${leadId}/${scrapeRunId}.md`;

  uploadPromises.push(
    s3Client.send(new PutObjectCommand({
      Bucket: CAMPAIGN_DATA_BUCKET,
      Key: combinedS3Key,
      Body: combinedMarkdown,
      ContentType: 'text/markdown',
    })).then(() => {})
  );

  await Promise.all(uploadPromises);

  const skipped = pages.length - validPages.length;
  const deduped = pageMarkdowns.size - seenFingerprints.size;
  console.log(`  [Markdown] Uploaded ${pageMarkdownKeys.size} page files + combined (${(combinedMarkdown.length / 1024).toFixed(1)}KB) to s3://${CAMPAIGN_DATA_BUCKET}/scrape-markdown/${leadId}/${scrapeRunId}/`);
  if (skipped > 0) console.log(`  [Markdown] Skipped ${skipped} junk pages (API/JSON/feed)`);
  if (deduped > 0) console.log(`  [Markdown] Deduped ${deduped} near-duplicate pages`);
  if (boilerplate) console.log(`  [Markdown] Stripped repeated footer boilerplate (${boilerplate.length} chars)`);

  return { combinedS3Key, pageMarkdownKeys };
}
