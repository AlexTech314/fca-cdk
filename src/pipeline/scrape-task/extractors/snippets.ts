import type { SnippetOfInterest, SnippetCategory } from '../types.js';

interface CategoryDef {
  category: SnippetCategory;
  keywords: string[];
  maxPerPage: number;
}

const CATEGORIES: CategoryDef[] = [
  {
    category: 'history',
    keywords: ['history', 'story', 'founded', 'established', 'began', 'started', 'heritage', 'tradition', 'legacy'],
    maxPerPage: 5,
  },
  {
    category: 'new_hire',
    keywords: ['welcome', 'joins our team', 'joins the team', 'new team member', 'new member', 'recently hired', 'new hire', 'just joined'],
    maxPerPage: 5,
  },
  {
    category: 'certification',
    keywords: ['certified', 'certification', 'accredited', 'accreditation', 'osha', 'iso ', 'leed', 'nate certified', 'epa certified', 'master certified'],
    maxPerPage: 5,
  },
  {
    category: 'award',
    keywords: ['award', 'awarded', 'winner', 'recognition', 'honored', 'best of', 'top rated', 'five star', '5-star', 'angi', 'super service', 'bbb a+'],
    maxPerPage: 5,
  },
  {
    category: 'licensing',
    keywords: ['license #', 'license no', 'licensed', 'permit', 'registration', 'registered contractor', 'bonded and licensed', 'fully licensed'],
    maxPerPage: 3,
  },
  {
    category: 'insurance',
    keywords: ['fully insured', 'insured and bonded', 'insurance', 'liability insurance', 'workers comp', 'bonded', 'general liability'],
    maxPerPage: 3,
  },
  {
    category: 'service_area',
    keywords: ['serving', 'we serve', 'service area', 'coverage area', 'proudly serving', 'throughout', 'communities we serve', 'areas we serve'],
    maxPerPage: 3,
  },
];

const MIN_SENTENCE_LENGTH = 15;
const MAX_SENTENCE_LENGTH = 300;

/**
 * Extract snippets of interest from page text, categorized by type.
 */
export function extractSnippetsOfInterest(text: string, html: string, sourceUrl: string): SnippetOfInterest[] {
  const snippets: SnippetOfInterest[] = [];
  const seenTexts = new Set<string>();

  const sentences = text.split(/[.!?]+/).filter(s => {
    const trimmed = s.trim();
    return trimmed.length >= MIN_SENTENCE_LENGTH && trimmed.length <= MAX_SENTENCE_LENGTH;
  });

  for (const def of CATEGORIES) {
    let count = 0;
    for (const sentence of sentences) {
      if (count >= def.maxPerPage) break;
      const lower = sentence.toLowerCase();
      if (def.keywords.some(kw => lower.includes(kw))) {
        const trimmed = sentence.trim().slice(0, MAX_SENTENCE_LENGTH);
        const dedupeKey = trimmed.toLowerCase();
        if (!seenTexts.has(dedupeKey)) {
          seenTexts.add(dedupeKey);
          snippets.push({ category: def.category, text: trimmed, source_url: sourceUrl });
          count++;
        }
      }
    }
  }

  // Tagline: extract from <meta name="description"> and <title> if short enough
  const metaDescMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']{10,150})["']/i)
    || html.match(/<meta\s+content=["']([^"']{10,150})["']\s+name=["']description["']/i);
  if (metaDescMatch) {
    const desc = metaDescMatch[1].trim();
    const dedupeKey = desc.toLowerCase();
    if (!seenTexts.has(dedupeKey)) {
      seenTexts.add(dedupeKey);
      snippets.push({ category: 'tagline', text: desc, source_url: sourceUrl });
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
