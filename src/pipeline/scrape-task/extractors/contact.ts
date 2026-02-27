import { PATTERNS } from '../config.js';
import { normalizePhone, isFakePhone } from '../utils/phone.js';

const JUNK_EMAIL_PATTERNS = [
  'example.com', 'domain.com', 'email.com', 'test.com',
  'mysite.com', 'yoursite.com', 'mycompany.com', 'yourcompany.com',
  'website.com', 'company.com', 'yourdomain.com',
  'sentry.io', 'wixpress.com', 'squarespace.com',
  'build.version', 'schema.org', 'w3.org', 'xmlns.com',
  'purl.org', 'ogp.me', 'rdfs.org',
];

function isJunkEmail(email: string): boolean {
  if (JUNK_EMAIL_PATTERNS.some(p => email.includes(p))) return true;
  if (/\.(png|jpg|gif|svg|css|js)$/i.test(email)) return true;
  return false;
}

/**
 * Extract emails from mailto: links (highest confidence)
 */
function extractMailtoEmails(html: string): string[] {
  const pattern = /href=["']mailto:([^"'?]+)/gi;
  const emails: string[] = [];
  const seen = new Set<string>();
  for (const match of html.matchAll(pattern)) {
    const normalized = match[1].toLowerCase().trim();
    if (!isJunkEmail(normalized) && !seen.has(normalized)) {
      seen.add(normalized);
      emails.push(normalized);
    }
  }
  return emails;
}

/**
 * Extract email addresses from text content and HTML mailto: links
 */
export function extractEmails(text: string, html?: string): string[] {
  const seen = new Set<string>();
  const emails: string[] = [];

  // Pass 1: mailto: links (high confidence)
  if (html) {
    for (const e of extractMailtoEmails(html)) {
      if (!seen.has(e)) { seen.add(e); emails.push(e); }
    }
  }

  // Pass 2: regex on text content
  const matches = text.match(PATTERNS.email) || [];
  for (const raw of matches) {
    const normalized = raw.toLowerCase().trim();
    if (seen.has(normalized) || isJunkEmail(normalized)) continue;
    seen.add(normalized);
    emails.push(normalized);
    if (emails.length >= 10) break;
  }
  
  if (emails.length > 0) {
    console.log(`    [Extract:Emails] Found ${emails.length}: ${emails.slice(0, 3).join(', ')}${emails.length > 3 ? '...' : ''}`);
  }
  return emails;
}

/**
 * Extract phone numbers from HTML tel: links (highest confidence)
 */
function extractTelLinkPhones(html: string): string[] {
  const telPattern = /href=["']tel:([^"']+)["']/gi;
  const phones: string[] = [];
  const seen = new Set<string>();
  for (const match of html.matchAll(telPattern)) {
    const normalized = normalizePhone(match[1]);
    if (normalized.length === 10 && !isFakePhone(normalized) && !seen.has(normalized)) {
      seen.add(normalized);
      phones.push(normalized);
    }
  }
  return phones;
}

const PHONE_CONTEXT_WORDS = /(?:phone|call|tel|fax|mobile|cell|office|dial|contact|reach|text)\b/i;

/**
 * Check if a phone match has nearby context suggesting it's a real phone number
 */
function hasPhoneContext(text: string, matchIndex: number, matchLength: number): boolean {
  const windowStart = Math.max(0, matchIndex - 80);
  const windowEnd = Math.min(text.length, matchIndex + matchLength + 80);
  const context = text.slice(windowStart, windowEnd);
  return PHONE_CONTEXT_WORDS.test(context);
}

/**
 * Extract phone numbers from text and HTML, excluding known phones and fake numbers.
 * Uses a two-pass approach: tel: links first (high confidence), then text with context validation.
 */
export function extractPhones(text: string, knownPhones: string[] = [], html?: string): string[] {
  const normalizedKnown = new Set(knownPhones.map(normalizePhone));
  const result = new Set<string>();

  // Pass 1: tel: links (always trustworthy)
  if (html) {
    for (const p of extractTelLinkPhones(html)) {
      if (!normalizedKnown.has(p)) result.add(p);
    }
  }

  // Pass 2: regex on text_content with context validation
  PATTERNS.phone.lastIndex = 0;
  const matches = [...text.matchAll(PATTERNS.phone)];
  for (const match of matches) {
    const normalized = normalizePhone(match[0]);
    if (normalized.length !== 10 || isFakePhone(normalized)) continue;
    if (normalizedKnown.has(normalized) || result.has(normalized)) continue;
    if (!hasPhoneContext(text, match.index!, match[0].length)) continue;
    result.add(normalized);
  }

  const phones = [...result].slice(0, 5);
  
  if (phones.length > 0) {
    console.log(`    [Extract:Phones] Found ${phones.length}: ${phones.slice(0, 3).join(', ')}${phones.length > 3 ? '...' : ''}`);
  }
  return phones;
}
