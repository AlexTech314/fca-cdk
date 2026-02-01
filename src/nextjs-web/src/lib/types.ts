// Navigation
export interface NavItem {
  name: string;
  href: string;
}

// Team
export interface TeamMember {
  name: string;
  title: string;
  bio: string;
  image?: string;
  linkedIn?: string;
  email?: string;
}

// Content Tag - for related content discovery
export interface ContentTag {
  slug: string;
  name: string;
  category?: string;                 // Optional grouping (e.g., "industry", "service-type")
}

// Tombstone - Full transaction record
export interface Tombstone {
  slug: string;                      // URL-friendly identifier (generated from seller name)
  seller: string;                    // Company/Seller name
  buyerPeFirm: string | null;        // PE firm (e.g., "O2 Capital")
  buyerPlatform: string | null;      // Platform company (e.g., "Straightaway Tire & Auto")
  industry: string;                  // Industry category
  transactionYear: number;           // Year of deal (e.g., 2025)
  city: string;                      // City location
  state: string;                     // State code (e.g., "CO", "TX")
  hasPressRelease: boolean;          // Whether there's a related news article
  pressReleaseSlug: string | null;   // Slug of the press release article (1-to-1)
  imagePath?: string;                // Path to tombstone image (from tombstones.ts mapping)
  tags: string[];                    // Array of tag slugs for related content discovery
}

// Tombstone with full press release and related news (for detail pages)
export interface TombstoneWithRelated extends Tombstone {
  pressRelease: NewsArticle | null;  // The 1-to-1 press release
  relatedNews: NewsArticleSummary[]; // Other related articles (by matching tags)
}

// Summary types for linked items
export interface NewsArticleSummary {
  slug: string;
  title: string;
  date: string;
  excerpt?: string;
}

export interface TombstoneSummary {
  slug: string;
  seller: string;
  industry: string;
  transactionYear: number;
}

// News Articles
export interface NewsArticle {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  content: string;
  author?: string;
  url?: string;                      // Original source URL
  tags: string[];                    // Array of tag slugs for related content discovery
}

// News Article with related content (for detail pages)
export interface NewsArticleWithRelated extends NewsArticle {
  relatedTombstones: TombstoneSummary[];  // Tombstones with matching tags
  relatedNews: NewsArticleSummary[];      // Other articles with matching tags
}

// Resource Articles
export interface ResourceArticle {
  slug: string;
  title: string;
  category: string;
  author: string;
  excerpt: string;
  content: string;
}

// FAQ
export interface FAQItem {
  question: string;
  answer: string;
}

// Services
export interface Service {
  title: string;
  description: string;
  items?: string[];
  href?: string;
}

// Core Values
export interface CoreValue {
  title: string;
  description: string;
}

// Industry Sector
export interface IndustrySector {
  name: string;
  description: string;
}

// Office Location
export interface OfficeLocation {
  city: string;
  state: string;
}

// Award
export interface Award {
  name: string;
  year?: string;
}

// Contact Info
export interface ContactInfo {
  phone: string;
  email: string;
  linkedIn?: string;
  locations: OfficeLocation[];
}

// Site Metadata
export interface SiteMetadata {
  siteName: string;
  siteUrl: string;
  tagline: string;
  description: string;
  ogImage: string;
}

// Page metadata for SEO
export interface PageSEO {
  title: string;
  description: string;
  canonical: string;
  ogImage?: string;
}
