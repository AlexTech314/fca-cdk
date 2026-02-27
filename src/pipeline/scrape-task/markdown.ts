/**
 * Convert scraped HTML pages to a single markdown document and upload to S3.
 */

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

function stripUnwantedElements(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, '')
    .replace(/<img[^>]*>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<figure[\s\S]*?<\/figure>/gi, '')
    .replace(/<figcaption[\s\S]*?<\/figcaption>/gi, '');
}

/**
 * Convert scraped pages to markdown and upload to S3.
 * Returns the S3 key.
 */
export async function convertAndUploadMarkdown(
  pages: ScrapedPage[],
  leadId: string,
  scrapeRunId: string,
): Promise<string> {
  const turndown = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
  });

  // Sort pages: priority pages first, then by URL
  const sorted = [...pages].sort((a, b) => {
    const pa = getPagePriority(a.url);
    const pb = getPagePriority(b.url);
    if (pa !== pb) return pa - pb;
    return a.url.localeCompare(b.url);
  });

  const parts: string[] = [];
  let totalLength = 0;

  for (const page of sorted) {
    if (totalLength >= MAX_MARKDOWN_CHARS) break;

    const cleanHtml = stripUnwantedElements(page.html);
    let md: string;
    try {
      md = turndown.turndown(cleanHtml);
    } catch {
      // Fallback to plain text if Turndown fails
      md = page.text_content;
    }

    // Collapse excessive whitespace
    md = md.replace(/\n{3,}/g, '\n\n').trim();

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

  const markdown = parts.join('');
  const s3Key = `scrape-markdown/${leadId}/${scrapeRunId}.md`;

  await s3Client.send(new PutObjectCommand({
    Bucket: CAMPAIGN_DATA_BUCKET,
    Key: s3Key,
    Body: markdown,
    ContentType: 'text/markdown',
  }));

  console.log(`  [Markdown] Uploaded ${(markdown.length / 1024).toFixed(1)}KB to s3://${CAMPAIGN_DATA_BUCKET}/${s3Key}`);

  return s3Key;
}
