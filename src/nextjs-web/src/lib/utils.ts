import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

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
 * Site constants
 */
export const siteConfig = {
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
  ogImage: '/og-image.jpg',
} as const;

/**
 * Navigation items
 */
export const navItems = [
  { name: 'About', href: '/about' },
  { name: 'Team', href: '/team' },
  { name: 'Transactions', href: '/transactions' },
  { name: 'News', href: '/news' },
  { name: 'Resources', href: '/resources' },
  { name: 'FAQ', href: '/faq' },
  { name: 'Contact', href: '/contact' },
] as const;

/**
 * Footer navigation groups
 */
export const footerNav = {
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
} as const;
