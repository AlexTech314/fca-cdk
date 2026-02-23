import { PATTERNS } from '../config.js';
import { normalizePhone, isFakePhone } from '../utils/phone.js';

/**
 * Extract email addresses from text content
 */
export function extractEmails(text: string, sourceUrl?: string): string[] {
  const matches = text.match(PATTERNS.email) || [];
  const seen = new Set<string>();
  const emails: string[] = [];
  for (const raw of matches) {
    const normalized = raw.toLowerCase().trim();
    if (seen.has(normalized)) continue;
    if (
      normalized.includes('example.com') ||
      normalized.includes('domain.com') ||
      normalized.includes('email.com') ||
      normalized.endsWith('.png') ||
      normalized.endsWith('.jpg') ||
      normalized.endsWith('.gif')
    ) continue;
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
 * Extract phone numbers from text, excluding known phones and fake numbers
 */
export function extractPhones(text: string, knownPhones: string[] = []): string[] {
  const matches = text.match(PATTERNS.phone) || [];
  
  // Normalize known phones for comparison
  const normalizedKnown = new Set(knownPhones.map(normalizePhone));
  
  // Normalize, dedupe, and filter
  const normalized = matches.map(normalizePhone);
  
  const phones = [...new Set(normalized)]
    .filter(p => p.length === 10)
    .filter(p => !normalizedKnown.has(p)) // Exclude already-known phones
    .filter(p => !isFakePhone(p))          // Exclude fake/test numbers
    .slice(0, 5);
  
  if (phones.length > 0) {
    console.log(`    [Extract:Phones] Found ${phones.length}: ${phones.slice(0, 3).join(', ')}${phones.length > 3 ? '...' : ''}`);
  }
  return phones;
}
