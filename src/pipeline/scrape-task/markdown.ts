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

function getPagePriority(url: string): number {
  const lower = url.toLowerCase();
  for (let i = 0; i < PRIORITY_PATHS.length; i++) {
    if (lower.includes(PRIORITY_PATHS[i])) return i;
  }
  return PRIORITY_PATHS.length;
}

/** Elements for Turndown to remove entirely (content + tags) via DOM parsing */
const REMOVE_ELEMENTS = [
  'script', 'style', 'noscript', 'svg', 'img', 'iframe',
  'figure', 'figcaption', 'picture', 'video', 'audio', 'canvas',
  'form', 'button', 'input', 'select', 'textarea',
  'nav', 'header', 'footer', 'aside',
  'link', 'meta',
];

function urlHash(url: string): string {
  return createHash('sha256').update(url).digest('hex').slice(0, 12);
}

function convertPageToMarkdown(page: ScrapedPage): string {
  const turndown = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
  });

  // Use Turndown's built-in DOM-based element removal (much more reliable than regex)
  turndown.remove(REMOVE_ELEMENTS);

  let md: string;
  try {
    md = turndown.turndown(page.html);
  } catch {
    md = page.text_content;
  }

  return md;
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

  // Sort pages: priority pages first, then by URL
  const sorted = [...pages].sort((a, b) => {
    const pa = getPagePriority(a.url);
    const pb = getPagePriority(b.url);
    if (pa !== pb) return pa - pb;
    return a.url.localeCompare(b.url);
  });

  // Upload individual per-page markdown files
  const uploadPromises: Promise<void>[] = [];
  for (const page of sorted) {
    const md = convertPageToMarkdown(page);
    if (!md) continue;

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

  // Build combined markdown for scoring (with char limit)
  const parts: string[] = [];
  let totalLength = 0;

  for (const page of sorted) {
    if (totalLength >= MAX_MARKDOWN_CHARS) break;

    const md = convertPageToMarkdown(page);
    if (!md) continue;

    const header = `# ${page.title || 'Untitled'}\n---\n`;
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

  console.log(`  [Markdown] Uploaded ${pageMarkdownKeys.size} page files + combined (${(combinedMarkdown.length / 1024).toFixed(1)}KB) to s3://${CAMPAIGN_DATA_BUCKET}/scrape-markdown/${leadId}/${scrapeRunId}/`);

  return { combinedS3Key, pageMarkdownKeys };
}
