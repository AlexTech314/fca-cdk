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

export interface TeamMember {
  name: string;
  title: string;
  isExecutive: boolean;
  source_url: string;
}

export interface AcquisitionSignal {
  text: string;
  signal_type: 'acquired' | 'sold' | 'merger' | 'new_ownership' | 'rebranded';
  date_mentioned?: string;
  source_url: string;
}

export type SnippetCategory =
  | 'history'
  | 'new_hire'
  | 'award'
  | 'certification'
  | 'licensing'
  | 'insurance'
  | 'service_area'
  | 'tagline';

export interface SnippetOfInterest {
  category: SnippetCategory;
  text: string;
  source_url: string;
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
  
  // Team/employee data
  team_members: TeamMember[];
  headcount_estimate: number | null;
  headcount_source: string | null;
  
  // Acquisition signals
  acquisition_signals: AcquisitionSignal[];
  has_acquisition_signal: boolean;
  acquisition_summary: string | null;
  
  // Business history
  founded_year: number | null;
  founded_source: string | null;
  years_in_business: number | null;

  // Snippets of interest (unified)
  snippets: SnippetOfInterest[];
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
