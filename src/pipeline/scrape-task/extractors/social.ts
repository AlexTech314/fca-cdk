import { PATTERNS } from '../config.js';
import type { ExtractedData, ScrapedPage } from '../types.js';

const FACEBOOK_BLOCKED_PREFIXES = new Set([
  'plugins',
  'share.php',
  'sharer.php',
  'dialog',
  'help',
  'privacy',
  'terms',
  'login',
  'watch',
  'events',
  'groups',
  'tr',
  'pixel',
  'ads',
]);

const LINKEDIN_BLOCKED_PREFIXES = new Set([
  'feed',
  'jobs',
  'learning',
  'mynetwork',
  'posts',
  'pulse',
  'search',
  'sharearticle',
]);

const INSTAGRAM_BLOCKED_PREFIXES = new Set([
  'explore',
  'p',
  'reel',
  'reels',
  'stories',
  'tv',
]);

const TWITTER_BLOCKED_PREFIXES = new Set([
  'home',
  'intent',
  'search',
  'share',
  'hashtag',
  'i',
]);

function getPathHead(pathname: string): string {
  return pathname
    .replace(/^\/+/, '')
    .split('/')[0]
    ?.toLowerCase() ?? '';
}

function normalizeProfileUrl(rawUrl: string): string | null {
  try {
    const parsed = new URL(rawUrl);
    parsed.hash = '';
    parsed.search = '';
    return parsed.href.replace(/\/+$/, '');
  } catch {
    return null;
  }
}

export function isValidSocialProfileUrl(
  rawUrl: string,
  platform: 'linkedin' | 'facebook' | 'instagram' | 'twitter'
): boolean {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return false;
  }

  const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
  const head = getPathHead(parsed.pathname);
  if (!head) return false;

  if (platform === 'linkedin') {
    if (host !== 'linkedin.com') return false;
    const validPath = /^\/(company|in)\/[^/]+\/?$/i;
    return validPath.test(parsed.pathname) && !LINKEDIN_BLOCKED_PREFIXES.has(head);
  }

  if (platform === 'facebook') {
    if (host !== 'facebook.com') return false;
    if (FACEBOOK_BLOCKED_PREFIXES.has(head)) return false;
    return true;
  }

  if (platform === 'instagram') {
    if (host !== 'instagram.com') return false;
    return !INSTAGRAM_BLOCKED_PREFIXES.has(head);
  }

  if (host !== 'twitter.com' && host !== 'x.com') return false;
  return !TWITTER_BLOCKED_PREFIXES.has(head);
}

function firstValidSocialMatch(
  matches: string[] | null,
  platform: 'linkedin' | 'facebook' | 'instagram' | 'twitter'
): string | undefined {
  if (!matches) return undefined;
  for (const candidate of matches) {
    if (isValidSocialProfileUrl(candidate, platform)) {
      const normalized = normalizeProfileUrl(candidate);
      if (normalized) return normalized;
    }
  }
  return undefined;
}

/**
 * Extract social media profile links from HTML content
 */
export function extractSocialLinks(html: string): ExtractedData['social'] {
  const social: ExtractedData['social'] = {};
  
  const linkedinMatch = firstValidSocialMatch(html.match(PATTERNS.linkedin), 'linkedin');
  if (linkedinMatch) social.linkedin = linkedinMatch;
  
  const facebookMatch = firstValidSocialMatch(html.match(PATTERNS.facebook), 'facebook');
  if (facebookMatch) social.facebook = facebookMatch;
  
  const instagramMatch = firstValidSocialMatch(html.match(PATTERNS.instagram), 'instagram');
  if (instagramMatch) social.instagram = instagramMatch;
  
  const twitterMatch = firstValidSocialMatch(html.match(PATTERNS.twitter), 'twitter');
  if (twitterMatch) social.twitter = twitterMatch;
  
  const found = Object.entries(social).filter(([, v]) => v);
  if (found.length > 0) {
    console.log(`    [Extract:Social] Found: ${found.map(([k, v]) => `${k}=${v}`).join(', ')}`);
  }
  
  return social;
}

/**
 * Find the contact page URL from scraped pages
 */
export function findContactPageUrl(pages: ScrapedPage[]): string | null {
  for (const page of pages) {
    if (PATTERNS.contactPage.test(page.url)) {
      console.log(`    [Extract:ContactPage] Found: ${page.url}`);
      return page.url;
    }
  }
  return null;
}
