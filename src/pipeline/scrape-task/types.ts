import { Browser } from 'puppeteer';

// ============ Filter and Job Types ============

export interface FilterRule {
  field: string;
  operator: 'EXISTS' | 'NOT_EXISTS' | 'EQUALS' | 'NOT_EQUALS';
  value?: string;
}

export interface JobInput {
  jobId?: string;  // deprecated, use taskId
  taskId?: string;
  runScrape?: boolean;
  maxPagesPerSite?: number;
  concurrency?: number;
  filterRules?: FilterRule[];
  skipIfDone?: boolean;
  forceRescrape?: boolean;
  placeIds?: string[];
  // Speed optimization options
  fastMode?: boolean; // Skip Puppeteer fallback entirely for max speed
  // Distributed Map batch reference (items stored in S3 to avoid container override size limits)
  batchS3Key?: string; // S3 key to read placeIds from
  batchIndex?: number; // Batch number for logging
}

// ============ Business Types ============

export interface Business {
  place_id: string;
  business_name: string;
  website_uri?: string;
  web_scraped?: boolean;
  phone?: string;
  international_phone?: string;
  [key: string]: unknown;
}

// ============ Scraped Data Types ============

export interface ScrapedPage {
  url: string;
  title: string;
  html: string;
  text_content: string;
  links: string[];
  status_code: number;
  scraped_at: string;
  /** URL of page that linked to this one (null for root) */
  parentUrl?: string | null;
  /** Depth in crawl tree (0 = root) */
  depth?: number;
}

// ============ Extracted Data Types ============

export interface ExtractedData {
  // Contact info
  emails: string[];
  phones: string[];
  contact_page_url: string | null;
  social: {
    linkedin?: string;
    facebook?: string;
    instagram?: string;
    twitter?: string;
  };

  // Provenance: maps extracted value -> source page URL
  emailSources?: Record<string, string>;
  phoneSources?: Record<string, string>;
  socialSources?: Record<string, string>;
}

// ============ HTTP Response Types ============

export interface CloudscraperResponse {
  body: string;
  statusCode: number;
}

// ============ Scrape Result Types ============

export interface ScrapePageResult {
  page: ScrapedPage;
  method: 'cloudscraper' | 'puppeteer';
}

export interface ScrapeWebsiteResult {
  pages: ScrapedPage[];
  method: 'cloudscraper' | 'puppeteer';
  cloudscraperCount: number;
  puppeteerCount: number;
}
