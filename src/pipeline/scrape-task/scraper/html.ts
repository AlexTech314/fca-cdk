/**
 * Extract text content from HTML, stripping tags, scripts, and styles
 */
export function extractTextContent(html: string): string {
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '')
    .replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, '')
    .replace(/<input[^>]*>/gi, '')
    .replace(/<textarea[^>]*>[\s\S]*?<\/textarea>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
  
  return text;
}

/**
 * Extract the page title from HTML
 */
export function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return match?.[1]?.trim() || '';
}

/**
 * Extract all links from HTML and resolve them to absolute URLs
 */
export function extractLinks(html: string, baseUrl: string): string[] {
  const links: string[] = [];
  const linkRegex = /href=["']([^"']+)["']/gi;
  let match;
  
  while ((match = linkRegex.exec(html)) !== null) {
    try {
      const href = match[1];
      if (href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) {
        continue;
      }
      
      const absoluteUrl = new URL(href, baseUrl).href;
      links.push(absoluteUrl);
    } catch {
      // Invalid URL, skip
    }
  }
  
  return [...new Set(links)];
}

/**
 * Check if HTML needs Puppeteer for JavaScript rendering
 * Returns true if the page appears to be a JavaScript SPA with minimal content
 */
export function needsPuppeteer(html: string): boolean {
  const textContent = extractTextContent(html);
  
  // Check if body is too short
  if (textContent.length < 500) {
    return true;
  }
  
  // Check for SPA patterns
  const spaPatterns = [
    /<div\s+id=["']root["'][^>]*>\s*<\/div>/i,
    /<div\s+id=["']app["'][^>]*>\s*<\/div>/i,
    /<div\s+id=["']__next["'][^>]*>\s*<\/div>/i,
    /Loading\.\.\./i,
    /<noscript[^>]*>.*(?:enable|requires?)\s+JavaScript/i,
  ];
  
  for (const pattern of spaPatterns) {
    if (pattern.test(html)) {
      return true;
    }
  }
  
  return false;
}

// ============ Schema.org JSON-LD Extraction ============

/**
 * Structured data extracted from Schema.org JSON-LD
 */
export interface SchemaOrgData {
  email?: string;
  telephone?: string;
  foundingDate?: string;
  foundingYear?: number;
  name?: string;
  description?: string;
  address?: {
    streetAddress?: string;
    addressLocality?: string;
    addressRegion?: string;
    postalCode?: string;
  };
  sameAs?: string[];  // Social media URLs
  numberOfEmployees?: number;
  founder?: string;
}

/**
 * Types we're interested in extracting from JSON-LD
 */
const SCHEMA_TYPES_OF_INTEREST = [
  'LocalBusiness',
  'Organization',
  'Corporation',
  'HomeAndConstructionBusiness',
  'ProfessionalService',
  'FinancialService',
  'InsuranceAgency',
  'RealEstateAgent',
  'LegalService',
  'Dentist',
  'Physician',
  'Store',
  'Restaurant',
  'AutoRepair',
  'Plumber',
  'Electrician',
  'HVACBusiness',
  'RoofingContractor',
  'GeneralContractor',
];

/**
 * Extract and merge Schema.org JSON-LD structured data from HTML.
 * Merges fields across multiple JSON-LD blocks (e.g. Organization + LocalBusiness).
 */
export function extractSchemaOrgData(html: string): SchemaOrgData | null {
  const scriptPattern = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const scriptMatches = [...html.matchAll(scriptPattern)];
  
  if (scriptMatches.length === 0) return null;
  
  const merged: SchemaOrgData = {};
  const allSameAs: string[] = [];
  let found = false;

  for (const scriptMatch of scriptMatches) {
    try {
      const data = JSON.parse(scriptMatch[1].trim());
      const items = Array.isArray(data['@graph']) ? data['@graph'] : [data];
      
      for (const item of items) {
        const itemType = item['@type'];
        const types = Array.isArray(itemType) ? itemType : [itemType];
        if (!types.some((t: string) => SCHEMA_TYPES_OF_INTEREST.includes(t))) continue;
        found = true;

        if (item.email && !merged.email) merged.email = String(item.email).replace(/^mailto:/i, '');
        if (item.telephone && !merged.telephone) merged.telephone = String(item.telephone);
        if (item.name && !merged.name) merged.name = String(item.name);
        if (item.description && !merged.description) merged.description = String(item.description);

        if (item.foundingDate && !merged.foundingYear) {
          merged.foundingDate = String(item.foundingDate);
          const year = parseInt(item.foundingDate.slice(0, 4), 10);
          if (year >= 1800 && year <= new Date().getFullYear()) merged.foundingYear = year;
        }

        if (item.address && typeof item.address === 'object' && !merged.address) {
          merged.address = {
            streetAddress: item.address.streetAddress,
            addressLocality: item.address.addressLocality,
            addressRegion: item.address.addressRegion,
            postalCode: item.address.postalCode,
          };
        }

        if (item.sameAs) {
          const urls = (Array.isArray(item.sameAs) ? item.sameAs : [item.sameAs])
            .filter((url: unknown): url is string => typeof url === 'string' && url.startsWith('http'));
          allSameAs.push(...urls);
        }

        if (item.numberOfEmployees && !merged.numberOfEmployees) {
          if (typeof item.numberOfEmployees === 'number') {
            merged.numberOfEmployees = item.numberOfEmployees;
          } else if (typeof item.numberOfEmployees === 'object') {
            const value = item.numberOfEmployees.value || item.numberOfEmployees.minValue;
            if (typeof value === 'number') merged.numberOfEmployees = value;
          }
        }

        if (item.founder && !merged.founder) {
          if (typeof item.founder === 'string') merged.founder = item.founder;
          else if (typeof item.founder === 'object' && item.founder.name) merged.founder = item.founder.name;
        }
      }
    } catch {
      // Invalid JSON, continue
    }
  }

  if (!found) return null;

  if (allSameAs.length > 0) {
    merged.sameAs = [...new Set(allSameAs)];
  }

  console.log(`    [Schema.org] Found: ${Object.keys(merged).filter(k => (merged as any)[k]).join(', ')}`);
  return merged;
}
