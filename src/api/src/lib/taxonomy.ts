/**
 * Content Tag Taxonomy
 *
 * Predefined tags for consistent tagging across tombstones and blog posts.
 * Tags are organized into three categories: industry, service-type, and deal-type.
 */

export interface TagDefinition {
  slug: string;
  name: string;
  category: 'industry' | 'service-type' | 'deal-type';
  description: string;
  keywords: string[];
}

export const TAG_TAXONOMY: TagDefinition[] = [
  // ===========================================
  // INDUSTRY TAGS (23)
  // ===========================================
  {
    slug: 'fire-safety',
    name: 'Fire & Life Safety',
    category: 'industry',
    description: 'Fire protection, sprinkler systems, alarms',
    keywords: ['fire', 'safety', 'sprinkler', 'alarm', 'protection', 'life safety', 'suppression'],
  },
  {
    slug: 'auto-repair',
    name: 'Auto Repair',
    category: 'industry',
    description: 'Automotive repair, maintenance, tire services',
    keywords: ['auto', 'automotive', 'repair', 'mechanic', 'tire', 'maintenance', 'vehicle'],
  },
  {
    slug: 'collision-repair',
    name: 'Collision & Auto Body',
    category: 'industry',
    description: 'Auto body repair, collision, paint',
    keywords: ['collision', 'auto body', 'body shop', 'paint', 'dent', 'fender'],
  },
  {
    slug: 'hvac',
    name: 'HVAC',
    category: 'industry',
    description: 'Heating, ventilation, air conditioning',
    keywords: ['hvac', 'heating', 'cooling', 'air conditioning', 'ventilation', 'furnace', 'ac'],
  },
  {
    slug: 'plumbing',
    name: 'Plumbing',
    category: 'industry',
    description: 'Plumbing installation and repair',
    keywords: ['plumbing', 'plumber', 'pipe', 'drain', 'water heater', 'sewer'],
  },
  {
    slug: 'electrical',
    name: 'Electrical Services',
    category: 'industry',
    description: 'Electrical contracting and supply',
    keywords: ['electrical', 'electrician', 'wiring', 'electric', 'power', 'lighting'],
  },
  {
    slug: 'environmental',
    name: 'Environmental Services',
    category: 'industry',
    description: 'Environmental consulting, reclamation',
    keywords: ['environmental', 'remediation', 'reclamation', 'cleanup', 'hazardous', 'waste'],
  },
  {
    slug: 'it-technology',
    name: 'IT & Technology',
    category: 'industry',
    description: 'IT consulting, MSP, software',
    keywords: ['it', 'technology', 'software', 'msp', 'managed services', 'computer', 'tech'],
  },
  {
    slug: 'petroleum',
    name: 'Petroleum & Lubricants',
    category: 'industry',
    description: 'Petroleum distribution, lubricants',
    keywords: ['petroleum', 'oil', 'lubricant', 'fuel', 'gas', 'diesel'],
  },
  {
    slug: 'oil-gas',
    name: 'Oil & Gas',
    category: 'industry',
    description: 'Oil and gas equipment and services',
    keywords: ['oil', 'gas', 'energy', 'drilling', 'pipeline', 'oilfield'],
  },
  {
    slug: 'refrigeration',
    name: 'Refrigeration',
    category: 'industry',
    description: 'Commercial refrigeration systems',
    keywords: ['refrigeration', 'refrigerator', 'cold storage', 'freezer', 'cooling'],
  },
  {
    slug: 'pool-spa',
    name: 'Pool & Spa',
    category: 'industry',
    description: 'Pool and spa services',
    keywords: ['pool', 'spa', 'swimming', 'hot tub', 'aquatic'],
  },
  {
    slug: 'roofing',
    name: 'Roofing',
    category: 'industry',
    description: 'Residential and commercial roofing',
    keywords: ['roofing', 'roof', 'shingle', 'gutter', 'siding'],
  },
  {
    slug: 'healthcare',
    name: 'Healthcare',
    category: 'industry',
    description: 'Healthcare services, pharmacy',
    keywords: ['healthcare', 'health', 'medical', 'pharmacy', 'clinic', 'hospital'],
  },
  {
    slug: 'advertising',
    name: 'Advertising & Marketing',
    category: 'industry',
    description: 'Advertising agencies',
    keywords: ['advertising', 'marketing', 'agency', 'media', 'digital', 'branding'],
  },
  {
    slug: 'transportation',
    name: 'Transportation & Logistics',
    category: 'industry',
    description: 'Trucking, logistics',
    keywords: ['transportation', 'trucking', 'logistics', 'freight', 'shipping', 'fleet'],
  },
  {
    slug: 'manufacturing',
    name: 'Manufacturing',
    category: 'industry',
    description: 'Manufacturing and fabrication',
    keywords: ['manufacturing', 'fabrication', 'production', 'factory', 'industrial'],
  },
  {
    slug: 'distribution',
    name: 'Distribution',
    category: 'industry',
    description: 'Wholesale distribution',
    keywords: ['distribution', 'wholesale', 'supply chain', 'distributor', 'warehouse'],
  },
  {
    slug: 'construction',
    name: 'Construction & Building',
    category: 'industry',
    description: 'Construction, building trades',
    keywords: ['construction', 'building', 'contractor', 'builder', 'trades'],
  },
  {
    slug: 'retail',
    name: 'Retail',
    category: 'industry',
    description: 'Retail businesses',
    keywords: ['retail', 'store', 'shop', 'consumer', 'sales'],
  },
  {
    slug: 'engineering',
    name: 'Engineering',
    category: 'industry',
    description: 'Engineering services',
    keywords: ['engineering', 'engineer', 'design', 'consulting', 'civil', 'mechanical'],
  },
  {
    slug: 'business-services',
    name: 'Business Services',
    category: 'industry',
    description: 'BPO, professional services',
    keywords: ['business services', 'bpo', 'professional services', 'consulting', 'outsourcing'],
  },
  {
    slug: 'travel-hospitality',
    name: 'Travel & Hospitality',
    category: 'industry',
    description: 'Travel, hospitality',
    keywords: ['travel', 'hospitality', 'hotel', 'tourism', 'vacation', 'lodging'],
  },
  {
    slug: 'aerospace-defense',
    name: 'Aerospace & Defense',
    category: 'industry',
    description: 'Aerospace, defense contractors',
    keywords: ['aerospace', 'defense', 'military', 'aviation', 'aircraft'],
  },

  // ===========================================
  // SERVICE TYPE TAGS (2)
  // ===========================================
  {
    slug: 'home-services',
    name: 'Home Services',
    category: 'service-type',
    description: 'Residential home services',
    keywords: ['home', 'residential', 'house', 'homeowner', 'dwelling'],
  },
  {
    slug: 'commercial-services',
    name: 'Commercial Services',
    category: 'service-type',
    description: 'Commercial and B2B services',
    keywords: ['commercial', 'business', 'b2b', 'corporate', 'enterprise'],
  },

  // ===========================================
  // DEAL TYPE TAGS (4)
  // ===========================================
  {
    slug: 'acquisition',
    name: 'Acquisition',
    category: 'deal-type',
    description: 'Company acquisitions and mergers',
    keywords: ['acquisition', 'acquire', 'merger', 'buy', 'purchase'],
  },
  {
    slug: 'private-equity',
    name: 'Private Equity',
    category: 'deal-type',
    description: 'PE-backed transactions',
    keywords: ['private equity', 'pe', 'equity', 'investment', 'fund'],
  },
  {
    slug: 'platform-add-on',
    name: 'Platform Add-On',
    category: 'deal-type',
    description: 'Add-on acquisitions',
    keywords: ['add-on', 'platform', 'bolt-on', 'tuck-in', 'strategic'],
  },
  {
    slug: 'recapitalization',
    name: 'Recapitalization',
    category: 'deal-type',
    description: 'Recaps and equity transactions',
    keywords: ['recapitalization', 'recap', 'restructure', 'refinance'],
  },
];

/**
 * Get all tags by category
 */
export function getTagsByCategory(category: TagDefinition['category']): TagDefinition[] {
  return TAG_TAXONOMY.filter((tag) => tag.category === category);
}

/**
 * Get a tag by slug
 */
export function getTagBySlug(slug: string): TagDefinition | undefined {
  return TAG_TAXONOMY.find((tag) => tag.slug === slug);
}

/**
 * Match content text to tags based on keywords
 * Returns matching tag slugs sorted by relevance (number of keyword matches)
 */
export function matchContentToTags(text: string): string[] {
  const lowerText = text.toLowerCase();
  const matches: Array<{ slug: string; score: number }> = [];

  for (const tag of TAG_TAXONOMY) {
    let score = 0;
    for (const keyword of tag.keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        score++;
      }
    }
    if (score > 0) {
      matches.push({ slug: tag.slug, score });
    }
  }

  // Sort by score descending and return slugs
  return matches.sort((a, b) => b.score - a.score).map((m) => m.slug);
}
