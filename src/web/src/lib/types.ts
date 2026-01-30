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

// Transactions
export interface Transaction {
  name: string;
  index: number;
}

// News Articles
export interface NewsArticle {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  content: string;
  author?: string;
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
