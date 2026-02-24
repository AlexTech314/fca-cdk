import type { SnippetOfInterest, SnippetCategory } from '../types.js';

interface CategoryDef {
  category: SnippetCategory;
  phrases: string[];
  /** If any of these appear in the sentence, reject it even if a phrase matched */
  rejectPhrases?: string[];
  maxPerPage: number;
  minWords: number;
}

const CATEGORIES: CategoryDef[] = [
  {
    category: 'history',
    phrases: [
      'founded in', 'established in', 'since 19', 'since 20',
      'years of experience', 'years in business', 'years serving',
      'family owned', 'family-owned', 'family operated', 'family-operated',
      'generation business', 'been in business', 'our history',
      'company was founded', 'we were founded', 'we were established',
      'has been serving', 'have been serving',
    ],
    maxPerPage: 3,
    minWords: 8,
  },
  {
    category: 'new_hire',
    phrases: [
      'joins our team', 'joins the team', 'joined our team', 'joined the team',
      'new team member', 'recently hired', 'new hire',
      'pleased to welcome', 'proud to welcome', 'excited to welcome',
      'welcome aboard',
    ],
    maxPerPage: 3,
    minWords: 6,
  },
  {
    category: 'certification',
    phrases: [
      'certified by', 'certification from', 'certified contractor',
      'accredited by', 'accreditation from',
      'osha certified', 'osha compliant', 'osha trained',
      'iso certified', 'iso 9001',
      'leed certified', 'leed accredited',
      'nate certified', 'epa certified', 'epa lead',
      'master certified', 'factory certified', 'manufacturer certified',
      'certified technician', 'certified installer', 'certified professional',
    ],
    maxPerPage: 3,
    minWords: 5,
  },
  {
    category: 'award',
    phrases: [
      'award winning', 'award-winning', 'won the award', 'received the award',
      'best of', 'top rated', 'top-rated', 'five star', '5-star', '5 star',
      'angi super service', 'angie\'s list', 'angies list',
      'bbb a+', 'bbb accredited', 'better business bureau',
      'voted best', 'named best', 'recognized as',
      'excellence award', 'service award',
    ],
    rejectPhrases: [
      'rewards', 'loyalty', 'cash back', 'cashback', 'earn points',
      'redeem', 'membership', 'auto delivery', 'points for every',
      'loyalty program', 'rewards program',
    ],
    maxPerPage: 3,
    minWords: 5,
  },
  {
    category: 'licensing',
    phrases: [
      'license #', 'license no', 'lic #', 'lic.',
      'licensed contractor', 'licensed and bonded', 'licensed & bonded',
      'fully licensed', 'state licensed',
      'registered contractor', 'contractor license',
      'bonded and licensed', 'bonded & licensed',
    ],
    maxPerPage: 2,
    minWords: 4,
  },
  {
    category: 'insurance',
    phrases: [
      'fully insured', 'insured and bonded', 'insured & bonded',
      'liability insurance', 'general liability',
      'workers comp', 'workers\' comp', 'workers compensation',
      'bonded and insured', 'bonded & insured',
      'carry insurance', 'carry full insurance',
    ],
    maxPerPage: 2,
    minWords: 4,
  },
  {
    category: 'service_area',
    phrases: [
      'we serve', 'proudly serving', 'serving the',
      'service area', 'coverage area', 'service region',
      'communities we serve', 'areas we serve', 'neighborhoods we serve',
      'serving clients in', 'serving customers in', 'serving residents',
      'serving homeowners', 'serving businesses in',
    ],
    maxPerPage: 2,
    minWords: 6,
  },
];

const MIN_SENTENCE_LENGTH = 30;
const MAX_SENTENCE_LENGTH = 300;
const MIN_TAGLINE_LENGTH = 20;

const NAV_JUNK = /\b(shop all|learn more|read more|click here|sign up|log in|subscribe|add to cart|buy now|view all|see more|load more|show more|menu|navigation|breadcrumb|footer|header|sidebar|skip link)\b/i;

function isCleanSentence(s: string): boolean {
  const words = s.split(/\s+/);
  const capsWords = words.filter(w => w.length > 2 && w === w.toUpperCase()).length;
  if (capsWords > 3) return false;
  if (NAV_JUNK.test(s)) return false;
  return true;
}

/**
 * Extract snippets of interest from page text, categorized by type.
 */
export function extractSnippetsOfInterest(text: string, html: string, sourceUrl: string): SnippetOfInterest[] {
  const snippets: SnippetOfInterest[] = [];
  const seenTexts = new Set<string>();

  const preprocessed = text
    .replace(/\b(U\.S|Dr|Mr|Mrs|Ms|Jr|Sr|Inc|Corp|Ltd|Co|Ave|St|Blvd|Rd|Ste|Dept|Est|approx)\./gi, '$1\u200B');
  const sentences = preprocessed.split(/[.!?]+/).map(s => s.replace(/\u200B/g, '.')).filter(s => {
    const trimmed = s.trim();
    return trimmed.length >= MIN_SENTENCE_LENGTH && trimmed.length <= MAX_SENTENCE_LENGTH && isCleanSentence(trimmed);
  });

  for (const def of CATEGORIES) {
    let count = 0;
    for (const sentence of sentences) {
      if (count >= def.maxPerPage) break;
      const trimmed = sentence.trim();
      const lower = trimmed.toLowerCase();
      const wordCount = trimmed.split(/\s+/).length;
      if (wordCount < def.minWords) continue;
      if (!def.phrases.some(phrase => lower.includes(phrase))) continue;
      if (def.rejectPhrases?.some(rp => lower.includes(rp))) continue;
      const snippetText = trimmed.slice(0, MAX_SENTENCE_LENGTH);
      const dedupeKey = snippetText.toLowerCase();
      if (!seenTexts.has(dedupeKey)) {
        seenTexts.add(dedupeKey);
        snippets.push({ category: def.category, text: snippetText, source_url: sourceUrl });
        count++;
      }
    }
  }

  const metaDescMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']{10,150})["']/i)
    || html.match(/<meta\s+content=["']([^"']{10,150})["']\s+name=["']description["']/i);
  if (metaDescMatch) {
    const desc = metaDescMatch[1].trim()
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ');
    if (desc.length >= MIN_TAGLINE_LENGTH && desc.split(/\s+/).length >= 3) {
      const dedupeKey = desc.toLowerCase();
      if (!seenTexts.has(dedupeKey)) {
        seenTexts.add(dedupeKey);
        snippets.push({ category: 'tagline', text: desc, source_url: sourceUrl });
      }
    }
  }

  if (snippets.length > 0) {
    const byCat = snippets.reduce<Record<string, number>>((acc, s) => {
      acc[s.category] = (acc[s.category] || 0) + 1;
      return acc;
    }, {});
    const summary = Object.entries(byCat).map(([k, v]) => `${k}:${v}`).join(', ');
    console.log(`    [Extract:Snippets] ${snippets.length} snippets (${summary})`);
  }

  return snippets;
}
