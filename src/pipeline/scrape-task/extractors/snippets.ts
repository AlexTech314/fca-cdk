import TurndownService from 'turndown';
import type { SnippetOfInterest, SnippetCategory } from '../types.js';
import { SNIPPET_CATEGORIES } from '../types.js';

interface CategoryConfig {
  phrases: string[];
  /** If any of these appear in the block, reject it even if a phrase matched */
  rejectPhrases?: string[];
  maxPerPage: number;
  minWords: number;
}

/**
 * Compiler enforces every SnippetCategory has a config entry.
 * Adding a category to SNIPPET_CATEGORIES without adding config here → compile error.
 */
const CATEGORY_CONFIGS: Record<SnippetCategory, CategoryConfig> = {
  history: {
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
  executive_hire: {
    phrases: [
      'joins our team', 'joins the team', 'joined our team', 'joined the team',
      'new team member', 'recently hired', 'new hire',
      'pleased to welcome', 'proud to welcome', 'excited to welcome',
      'welcome aboard',
    ],
    rejectPhrases: [
      'technician', 'installer', 'helper', 'apprentice', 'intern',
    ],
    maxPerPage: 3,
    minWords: 6,
  },
  certification: {
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
  award: {
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
  licensing: {
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
  revenue_scale: {
    phrases: [
      'million in revenue', 'annual revenue', 'revenue of',
      'projects completed', 'jobs completed', 'homes built',
      'customers served', 'clients served', 'households served',
      'units managed', 'properties managed',
      'square feet', 'sq ft installed', 'acres managed',
    ],
    maxPerPage: 3,
    minWords: 6,
  },
  recurring_revenue: {
    phrases: [
      'maintenance contract', 'maintenance agreement', 'maintenance plan',
      'service contract', 'service agreement', 'service plan',
      'managed services', 'monthly service', 'annual service',
      'subscription', 'retainer', 'preventive maintenance',
      'recurring', 'ongoing maintenance', 'planned maintenance',
    ],
    rejectPhrases: [
      'cancel anytime', 'free trial', 'newsletter', 'unsubscribe',
    ],
    maxPerPage: 3,
    minWords: 6,
  },
  commercial_clients: {
    phrases: [
      'commercial clients', 'commercial customers', 'commercial projects',
      'government contract', 'federal contract', 'state contract', 'municipal',
      'property management', 'property managers',
      'general contractor', 'subcontract',
      'hoa', 'homeowners association',
      'fortune 500', 'enterprise clients', 'corporate clients',
      'institutional', 'industrial clients',
    ],
    maxPerPage: 3,
    minWords: 6,
  },
  multi_location: {
    phrases: [
      'locations across', 'offices across', 'branches across',
      'expanded to', 'expanding to', 'opened our',
      'regional offices', 'multiple locations', 'multiple offices',
      'serving multiple', 'nationwide', 'statewide',
      'locations in', 'branches in',
    ],
    rejectPhrases: [
      'apply now', 'job opening', 'career',
    ],
    maxPerPage: 2,
    minWords: 6,
  },
  succession: {
    phrases: [
      'retirement', 'retiring', 'looking to sell', 'ready to sell',
      'next chapter', 'succession plan', 'transition plan',
      'passing the torch', 'stepping down', 'winding down',
      'exit strategy', 'business transition', 'ownership transition',
      'legacy planning',
    ],
    maxPerPage: 2,
    minWords: 6,
  },
  proprietary: {
    phrases: [
      'patented', 'patent pending', 'patent #',
      'proprietary technology', 'proprietary process', 'proprietary system',
      'proprietary method', 'proprietary software', 'proprietary formula',
      'fleet of', 'specialized equipment', 'custom-built',
      'trade secret', 'in-house developed', 'internally developed',
    ],
    maxPerPage: 3,
    minWords: 5,
  },
};

/** Title keywords that indicate management-level hires (used by executive_hire) */
const EXEC_TITLE_KEYWORDS = /\b(ceo|cfo|coo|cto|cio|president|vice president|vp|director|general manager|gm|manager|supervisor|team lead)\b/i;

const MIN_BLOCK_LENGTH = 30;
const MAX_BLOCK_LENGTH = 300;

const NAV_JUNK = /\b(shop all|learn more|read more|click here|sign up|log in|subscribe|add to cart|buy now|view all|see more|load more|show more|menu|navigation|breadcrumb|footer|header|sidebar|skip link)\b/i;

function isCleanSentence(s: string): boolean {
  const words = s.split(/\s+/);
  const capsWords = words.filter(w => w.length > 2 && w === w.toUpperCase()).length;
  if (capsWords > 3) return false;
  if (NAV_JUNK.test(s)) return false;
  return true;
}

/**
 * Strip remaining markdown formatting to get plain text.
 */
function stripMarkdown(md: string): string {
  return md
    // Remove images ![alt](url)
    .replace(/!\[.*?\]\(.*?\)/g, '')
    // Convert links [text](url) to just text
    .replace(/\[([^\]]*)\]\(.*?\)/g, '$1')
    // Remove bold/italic markers
    .replace(/(\*{1,3}|_{1,3})(.*?)\1/g, '$2')
    // Remove inline code
    .replace(/`([^`]*)`/g, '$1')
    // Remove heading markers
    .replace(/^#{1,6}\s+/gm, '')
    // Remove blockquote markers
    .replace(/^>\s+/gm, '')
    // Remove horizontal rules
    .replace(/^[-*_]{3,}$/gm, '')
    // Remove list markers
    .replace(/^[\s]*[-*+]\s+/gm, '')
    .replace(/^[\s]*\d+\.\s+/gm, '')
    // Collapse whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Convert HTML to clean text blocks using Turndown (HTML → Markdown),
 * then split on paragraph boundaries for element-respecting extraction.
 */
function htmlToTextBlocks(html: string): string[] {
  // Strip non-content tags first
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, '');

  const td = new TurndownService({
    headingStyle: 'atx',
    bulletListMarker: '-',
  });

  // Remove images and iframes entirely
  td.remove(['img', 'iframe', 'figure', 'figcaption']);

  const markdown = td.turndown(cleaned);

  // Split on double-newlines (paragraph boundaries in markdown)
  const rawBlocks = markdown.split(/\n{2,}/);

  const blocks: string[] = [];
  for (const raw of rawBlocks) {
    const text = stripMarkdown(raw);
    if (
      text.length >= MIN_BLOCK_LENGTH &&
      text.length <= MAX_BLOCK_LENGTH &&
      isCleanSentence(text)
    ) {
      blocks.push(text);
    }
  }

  return blocks;
}

/**
 * Extract snippets of interest from page HTML, categorized by type.
 * Uses Turndown to convert HTML to markdown blocks, preserving element boundaries.
 */
export function extractSnippetsOfInterest(html: string, sourceUrl: string): SnippetOfInterest[] {
  const snippets: SnippetOfInterest[] = [];
  const seenTexts = new Set<string>();

  const blocks = htmlToTextBlocks(html);

  for (const category of SNIPPET_CATEGORIES) {
    const config = CATEGORY_CONFIGS[category];
    let count = 0;
    for (const block of blocks) {
      if (count >= config.maxPerPage) break;
      const lower = block.toLowerCase();
      const wordCount = block.split(/\s+/).length;
      if (wordCount < config.minWords) continue;
      if (!config.phrases.some(phrase => lower.includes(phrase))) continue;
      if (config.rejectPhrases?.some(rp => lower.includes(rp))) continue;

      // executive_hire: require a management-level title keyword in the block
      if (category === 'executive_hire' && !EXEC_TITLE_KEYWORDS.test(block)) continue;

      const snippetText = block.slice(0, MAX_BLOCK_LENGTH);
      const dedupeKey = snippetText.toLowerCase();
      if (!seenTexts.has(dedupeKey)) {
        seenTexts.add(dedupeKey);
        snippets.push({ category, text: snippetText, source_url: sourceUrl });
        count++;
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
