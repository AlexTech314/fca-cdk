import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { getSiteConfig, type ApiSiteConfig } from './api';

/**
 * Merge Tailwind CSS classes with clsx
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Convert a string to a URL-friendly slug
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .trim();
}

export const assetBaseUrl = 'https://d1bjh7dvpwoxii.cloudfront.net';

export function toAssetUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  if (path.startsWith('/')) return `${assetBaseUrl}${path}`;
  return `${assetBaseUrl}/${path}`;
}

/**
 * Format a phone number for display
 */
export function formatPhone(phone: string): string {
  return phone.replace(/(\d{3})\.(\d{3})\.(\d{4})/, '$1.$2.$3');
}

/**
 * Format a phone number for tel: links
 */
export function phoneHref(phone: string): string {
  return `tel:+1${phone.replace(/\D/g, '')}`;
}

/**
 * Format an email for mailto: links
 */
export function emailHref(email: string): string {
  return `mailto:${email}`;
}

/**
 * Strip markdown syntax from text for plain display (e.g. excerpts)
 */
export function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s+/g, '') // headers (anywhere in text)
    .replace(/\*\*(.+?)\*\*/g, '$1') // bold
    .replace(/\*(.+?)\*/g, '$1') // italic
    .replace(/__(.+?)__/g, '$1') // bold alt
    .replace(/_(.+?)_/g, '$1') // italic alt
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links
    .replace(/^[-*]\s+/gm, '') // list bullets
    .replace(/^\d+\.\s+/gm, '') // numbered lists
    .replace(/---+/g, ' ') // horizontal rules
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Truncate text to a specified length
 */
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length).trim() + '...';
}

/**
 * Get the current year
 */
export function getCurrentYear(): number {
  return new Date().getFullYear();
}

/**
 * Site config type used across the app
 */
export interface SiteConfigData {
  name: string;
  tagline: string;
  url: string;
  description: string;
  phone: string;
  email: string;
  linkedIn: string;
  locations: { city: string; state: string }[];
  ogImage: string;
  navItems: { name: string; href: string }[];
  footerNav: {
    services: { name: string; href: string }[];
    company: { name: string; href: string }[];
    resources: { name: string; href: string }[];
  };
  serviceTypes: string[];
  companyBlurb: string;
}

/**
 * Default site config (fallback when API is unavailable).
 * Used by static metadata exports and as a safety net.
 */
export const siteConfigDefaults: SiteConfigData = {
  name: 'Flatirons Capital Advisors',
  tagline: 'Strategic Advice | Process Driven™',
  url: 'https://flatironscap.com',
  description: 'Flatirons Capital Advisors is a North American mergers and acquisitions advisory firm specializing in lower middle-market transactions.',
  phone: '303.319.4540',
  email: 'info@flatironscap.com',
  linkedIn: 'https://www.linkedin.com/company/flatirons-capital-advisors-llc',
  locations: [
    { city: 'Denver', state: 'Colorado' },
    { city: 'Dallas', state: 'Texas' },
    { city: 'Miami', state: 'Florida' },
    { city: 'Chicago', state: 'Illinois' },
  ],
  ogImage: 'https://d1bjh7dvpwoxii.cloudfront.net/meta/og-image.jpg',
  serviceTypes: [
    'Mergers and Acquisitions Advisory',
    'Sell-Side Advisory',
    'Buy-Side Advisory',
    'Strategic Consulting',
    'Investment Banking',
  ],
  companyBlurb: 'Flatirons Capital Advisors, LLC is an investment banking firm that helps privately held companies sell their businesses, acquire other businesses, and raise capital.',
  navItems: [
    { name: 'About', href: '/about' },
    { name: 'Team', href: '/team' },
    { name: 'Transactions', href: '/transactions' },
    { name: 'News', href: '/news' },
    { name: 'Resources', href: '/resources' },
    { name: 'FAQ', href: '/faq' },
    { name: 'Contact', href: '/contact' },
  ],
  footerNav: {
    services: [
      { name: 'Sell-Side Advisory', href: '/sell-side' },
      { name: 'Buy-Side Advisory', href: '/buy-side' },
      { name: 'Strategic Consulting', href: '/about' },
    ],
    company: [
      { name: 'About', href: '/about' },
      { name: 'Team', href: '/team' },
      { name: 'Transactions', href: '/transactions' },
      { name: 'Contact', href: '/contact' },
    ],
    resources: [
      { name: 'News & Insights', href: '/news' },
      { name: 'Resources', href: '/resources' },
      { name: 'FAQ', href: '/faq' },
      { name: 'Privacy Policy', href: '/privacy-policy' },
    ],
  },
};

/**
 * Synchronous alias — use for static metadata exports that can't be async.
 * For server components, prefer fetchSiteConfig() to get live data.
 */
export const siteConfig = siteConfigDefaults;

/** Convenience aliases so existing imports keep working */
export const navItems = siteConfigDefaults.navItems;
export const footerNav = siteConfigDefaults.footerNav;

/**
 * Fetch site config from the API with fallback to defaults.
 * Call from async server components / layouts.
 */
function mapApiToSiteConfig(api: ApiSiteConfig): SiteConfigData {
  return {
    name: api.name,
    tagline: api.tagline || siteConfigDefaults.tagline,
    url: api.url,
    description: api.description || siteConfigDefaults.description,
    phone: api.phone || siteConfigDefaults.phone,
    email: api.email || siteConfigDefaults.email,
    linkedIn: api.linkedIn || siteConfigDefaults.linkedIn,
    locations: (api.locations as SiteConfigData['locations']) || siteConfigDefaults.locations,
    ogImage: api.ogImage || siteConfigDefaults.ogImage,
    serviceTypes: (api.serviceTypes as string[]) || siteConfigDefaults.serviceTypes,
    companyBlurb: api.companyBlurb || siteConfigDefaults.companyBlurb,
    navItems: (api.navItems as SiteConfigData['navItems']) || siteConfigDefaults.navItems,
    footerNav: (api.footerNav as SiteConfigData['footerNav']) || siteConfigDefaults.footerNav,
  };
}

export async function fetchSiteConfig(): Promise<SiteConfigData> {
  const api = await getSiteConfig();
  if (!api) return siteConfigDefaults;
  return mapApiToSiteConfig(api);
}

/**
 * Build page-level metadata that properly overrides root layout OG/Twitter
 * without losing images, card type, etc.
 *
 * Usage in page generateMetadata():
 *   return pageMetadata(config, { title: 'About', description: '...' });
 */
export function pageMetadata(
  config: SiteConfigData,
  opts: {
    title: string;
    description: string;
    canonical: string;
    robots?: { index: boolean; follow: boolean };
  },
) {
  const ogTitle = opts.title.includes(config.name)
    ? opts.title
    : `${opts.title} | ${config.name}`;

  return {
    title: opts.title,
    description: opts.description,
    alternates: { canonical: opts.canonical },
    ...(opts.robots ? { robots: opts.robots } : {}),
    openGraph: {
      title: ogTitle,
      description: opts.description,
      url: opts.canonical,
      type: 'website' as const,
      siteName: config.name,
      locale: 'en_US',
      images: [
        {
          url: config.ogImage,
          width: 1200,
          height: 630,
          alt: config.name,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image' as const,
      title: ogTitle,
      description: opts.description,
      images: [config.ogImage],
    },
  };
}
