import type { Browser, Page } from 'playwright-core';
import { cloudscraper } from '../config.js';
import type { ScrapedPage, CloudscraperResponse, ScrapePageResult } from '../types.js';
import { extractTextContent, extractTitle, extractLinks, needsPlaywright } from './html.js';

// ============ Error Classification ============

export interface ScrapeError {
  type: 'timeout' | 'dns' | 'connection' | 'cloudflare' | 'http' | 'unknown';
  code?: string;
  statusCode?: number;
  message: string;
}

/**
 * Classify an error for tracking and decision-making
 */
export function classifyError(error: any): ScrapeError {
  const message = error?.message || String(error);
  const code = error?.code;
  
  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') {
    return { type: 'dns', code, message: 'Domain not found' };
  }
  if (code === 'ECONNREFUSED') {
    return { type: 'connection', code, message: 'Connection refused' };
  }
  if (code === 'ECONNRESET' || code === 'EPIPE') {
    return { type: 'connection', code, message: 'Connection reset' };
  }
  if (code === 'ETIMEDOUT' || message.includes('timeout')) {
    return { type: 'timeout', code, message: 'Request timeout' };
  }
  if (message.includes('403') || message.includes('Cloudflare')) {
    return { type: 'cloudflare', message: 'Cloudflare protection' };
  }
  
  return { type: 'unknown', code, message: message.slice(0, 100) };
}

/**
 * Check if error is retriable (worth trying again with same method)
 */
export function isRetriableError(error: ScrapeError): boolean {
  return error.type === 'timeout' || error.type === 'connection';
}

/**
 * Check if error means we should skip Playwright fallback
 */
export function shouldSkipPlaywright(error: ScrapeError): boolean {
  return error.type === 'dns';
}

// ============ Cloudflare Detection ============

const CLOUDFLARE_PATTERNS = [
  'Just a moment',
  'cf-browser-verification',
  'cf_chl_opt',
  'challenge-platform',
  '__cf_chl_f_tk',
  'Enable JavaScript and cookies',
  'Checking your browser',
  'cf-spinner',
];

/**
 * Check if HTML response is a Cloudflare challenge page
 */
export function isCloudflareChallenge(html: string): boolean {
  return CLOUDFLARE_PATTERNS.some(pattern => html.includes(pattern));
}

/**
 * Check if response indicates Cloudflare protection in status or body
 */
export function needsCloudflareBypass(statusCode: number, html: string): boolean {
  if (statusCode === 403 || statusCode === 503) {
    return true;
  }
  return isCloudflareChallenge(html);
}

// ============ Fetching ============

/**
 * Fetch a URL using cloudscraper to bypass Cloudflare protection
 */
export async function fetchWithCloudscraper(url: string, timeoutMs: number = 10000): Promise<CloudscraperResponse> {
  // Create a timeout promise
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Request timeout')), timeoutMs);
  });

  // Create the cloudscraper request promise
  const requestPromise = cloudscraper({
    method: 'GET',
    uri: url,
    resolveWithFullResponse: true,
    headers: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    },
  }).then((response: { statusCode: number; body: string }) => ({
    body: response.body,
    statusCode: response.statusCode || 200,
  }));

  // Race between timeout and request
  return Promise.race([requestPromise, timeoutPromise]);
}

/**
 * Fetch with retry and exponential backoff
 */
export async function fetchWithRetry(
  url: string, 
  maxRetries: number = 2
): Promise<{ response: CloudscraperResponse; attempts: number } | { error: ScrapeError; attempts: number }> {
  let lastError: ScrapeError | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Exponential backoff: 10s, 15s, 20s
      const timeoutMs = 10000 + (attempt * 5000);
      const response = await fetchWithCloudscraper(url, timeoutMs);
      return { response, attempts: attempt + 1 };
    } catch (err) {
      lastError = classifyError(err);
      
      // Don't retry DNS errors - domain won't magically appear
      if (!isRetriableError(lastError)) {
        break;
      }
      
      if (attempt < maxRetries) {
        const backoffMs = Math.min(1000 * Math.pow(2, attempt), 4000);
        console.log(`  [Retry ${attempt + 1}/${maxRetries}] ${url} after ${backoffMs}ms`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }
  }
  
  return { error: lastError!, attempts: maxRetries + 1 };
}

// ============ Page Pool ============

/**
 * Simple page pool for Playwright page reuse
 */
export class PagePool {
  private available: Page[] = [];
  private browser: Browser;
  private maxPages: number;
  private created: number = 0;
  
  constructor(browser: Browser, maxPages: number = 5) {
    this.browser = browser;
    this.maxPages = maxPages;
  }
  
  async acquire(): Promise<Page> {
    if (this.available.length > 0) {
      return this.available.pop()!;
    }

    if (this.created < this.maxPages) {
      this.created++;
      const page = await this.browser.newPage();
      return page;
    }
    
    // Wait for a page to become available
    while (this.available.length === 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return this.available.pop()!;
  }
  
  release(page: Page) {
    this.available.push(page);
  }
  
  async closeAll() {
    for (const page of this.available) {
      await page.close().catch(() => {});
    }
    this.available = [];
    this.created = 0;
  }
}

// ============ Scraping ============

export interface ScrapePageOptions {
  browser?: Browser | null;
  pagePool?: PagePool | null;
}

/** Random delay with jitter to mimic human timing */
function humanDelay(minMs: number, maxMs: number): Promise<void> {
  const ms = Math.floor(Math.random() * (maxMs - minMs)) + minMs;
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** Pick a random element from an array */
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Random int in [min, max] */
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Simulate human-like interactions on a page to look organic.
 * Randomly combines several behaviors so no two page loads
 * produce the same interaction pattern.
 */
async function humanize(page: Page): Promise<void> {
  try {
    // 1. Initial "settling" pause — humans don't act instantly
    await humanDelay(400, 1200);

    // 2. Mouse wander — 2-4 random movements across the viewport
    const moves = randInt(2, 4);
    for (let i = 0; i < moves; i++) {
      const x = randInt(80, 1200);
      const y = randInt(60, 700);
      await page.mouse.move(x, y, { steps: randInt(4, 12) });
      await humanDelay(80, 300);
    }

    // 3. Scroll behaviour — pick one pattern at random
    const scrollStyle = pick(['smooth-down', 'down-up', 'multi-step']);
    switch (scrollStyle) {
      case 'smooth-down': {
        const dy = randInt(200, 600);
        await page.evaluate(`window.scrollBy({top:${dy},behavior:'smooth'})`);
        await humanDelay(600, 1400);
        break;
      }
      case 'down-up': {
        const dy = randInt(300, 800);
        await page.evaluate(`window.scrollBy({top:${dy},behavior:'smooth'})`);
        await humanDelay(500, 1000);
        const up = randInt(50, Math.min(dy, 200));
        await page.evaluate(`window.scrollBy({top:${-up},behavior:'smooth'})`);
        await humanDelay(300, 700);
        break;
      }
      case 'multi-step': {
        const steps = randInt(2, 4);
        for (let i = 0; i < steps; i++) {
          const dy = randInt(80, 250);
          await page.evaluate(`window.scrollBy({top:${dy},behavior:'smooth'})`);
          await humanDelay(200, 600);
        }
        break;
      }
    }

    // 4. Occasionally hover over a random link (30 % chance)
    if (Math.random() < 0.3) {
      const link = await page.$('a[href]');
      if (link) {
        await link.hover();
        await humanDelay(150, 500);
      }
    }

    // 5. Final idle pause — reading time
    await humanDelay(200, 800);
  } catch {
    // non-critical — ignore interaction failures
  }
}

/**
 * Scrape a single page using cloudscraper with Playwright fallback
 * Returns result plus error info for tracking
 */
export async function scrapePage(
  url: string, 
  options: ScrapePageOptions = {}
): Promise<{ result: ScrapePageResult | null; error?: ScrapeError }> {
  const { browser, pagePool } = options;
  
  try {
    let html: string;
    let statusCode: number;
    let usedPlaywright = false;
    let scrapeError: ScrapeError | undefined;
    
    // First, try cloudscraper with retry
    const fetchResult = await fetchWithRetry(url);
    
    if ('error' in fetchResult) {
      scrapeError = fetchResult.error;
      const errorLabel = `${scrapeError.type}${scrapeError.code ? `:${scrapeError.code}` : ''}`;
      
      // Check if we should skip Playwright entirely
      if (shouldSkipPlaywright(scrapeError)) {
        console.log(`  [${errorLabel}] ${url} - skipping (unrecoverable)`);
        return { result: null, error: scrapeError };
      }
      
      // Try Playwright fallback
      if (browser || pagePool) {
        console.log(`  [${errorLabel}] ${url} - trying Playwright`);

        let page: Page | null = null;
        try {
          page = pagePool ? await pagePool.acquire() : await browser!.newPage();

          await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
          await humanize(page);

          // Wait for Cloudflare challenge to resolve
          let attempts = 0;
          const maxAttempts = 10;
          while (attempts < maxAttempts) {
            const pageContent = await page.content();
            if (!isCloudflareChallenge(pageContent)) {
              break;
            }
            console.log(`  [Cloudflare] Waiting for challenge... (${attempts + 1}/${maxAttempts})`);
            await new Promise(resolve => setTimeout(resolve, 3000));
            attempts++;
          }

          html = await page.content();
          statusCode = 200;
          usedPlaywright = true;

          if (pagePool) {
            pagePool.release(page);
          } else {
            await page.close();
          }
          page = null;

          // Check if still on Cloudflare challenge
          if (isCloudflareChallenge(html)) {
            console.log(`  [Cloudflare] Challenge not resolved for ${url}`);
            return { result: null, error: { type: 'cloudflare', message: 'Challenge not resolved' } };
          }
        } catch (playwrightError) {
          console.log(`  [Playwright error] ${url}: ${playwrightError}`);
          if (page) {
            if (pagePool) {
              pagePool.release(page);
            } else {
              await page.close().catch(() => {});
            }
          }
          return { result: null, error: scrapeError };
        }
      } else {
        console.log(`  [${errorLabel}] ${url}`);
        return { result: null, error: scrapeError };
      }
    } else {
      html = fetchResult.response.body;
      statusCode = fetchResult.response.statusCode;
      
      if (statusCode >= 400) {
        console.log(`  [${statusCode}] ${url}`);
        return { result: null, error: { type: 'http', statusCode, message: `HTTP ${statusCode}` } };
      }
      
      // Check if we got a Cloudflare challenge page despite 200 status
      if (needsCloudflareBypass(statusCode, html) && (browser || pagePool)) {
        console.log(`  [Cloudflare in body] ${url} - using Playwright`);

        let page: Page | null = null;
        try {
          page = pagePool ? await pagePool.acquire() : await browser!.newPage();

          await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
          await humanize(page);

          let attempts = 0;
          while (attempts < 10) {
            const pageContent = await page.content();
            if (!isCloudflareChallenge(pageContent)) break;
            await new Promise(resolve => setTimeout(resolve, 3000));
            attempts++;
          }

          html = await page.content();
          usedPlaywright = true;
          
          if (pagePool) {
            pagePool.release(page);
          } else {
            await page.close();
          }
          page = null;
        } catch (err) {
          if (page) {
            if (pagePool) {
              pagePool.release(page);
            } else {
              await page.close().catch(() => {});
            }
          }
          // Fall through with original HTML
        }
      }
    }
    
    // Check if we need Playwright for JavaScript rendering
    if (!usedPlaywright && (browser || pagePool) && needsPlaywright(html)) {
      console.log(`  [JS] ${url} - needs Playwright for rendering`);

      let page: Page | null = null;
      try {
        page = pagePool ? await pagePool.acquire() : await browser!.newPage();

        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
        await humanize(page);
        html = await page.content();
        usedPlaywright = true;
        
        if (pagePool) {
          pagePool.release(page);
        } else {
          await page.close();
        }
      } catch (error) {
        console.log(`  [Playwright error] ${url}: ${error}`);
        if (page) {
          if (pagePool) {
            pagePool.release(page);
          } else {
            await page.close().catch(() => {});
          }
        }
        // Fall back to cloudscraper HTML
      }
    }
    
    const textContent = extractTextContent(html);
    const title = extractTitle(html);
    const links = extractLinks(html, url);
    
    const method = usedPlaywright ? 'playwright' : 'cloudscraper';
    console.log(`  [${method}] ${url} - ${textContent.length} chars, ${links.length} links`);
    
    return {
      result: {
        page: {
          url,
          title,
          html,
          text_content: textContent,
          links,
          status_code: statusCode,
          scraped_at: new Date().toISOString(),
        },
        method,
      },
    };
  } catch (error) {
    const scrapeError = classifyError(error);
    console.log(`  [Error:${scrapeError.type}] ${url}: ${scrapeError.message}`);
    return { result: null, error: scrapeError };
  }
}
