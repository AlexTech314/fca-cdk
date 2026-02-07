/**
 * Unified Tag Taxonomy — SEEDING UTILITY ONLY
 * 
 * This module defines the canonical set of content tags used during
 * database seeding. Frontend components should NOT import from this file;
 * they should fetch tag data from the API via lib/api.ts or lib/data.ts instead.
 * 
 * The tag data lives in the ContentTag table and is served via the /tags API endpoint.
 */

/**
 * Tag definition with metadata
 */
export interface TagDefinition {
  slug: string;
  name: string;
  category: 'industry' | 'service-type' | 'deal-type';
  description?: string;
  /** Keywords that trigger this tag in content matching */
  keywords: string[];
}

/**
 * Master tag taxonomy - the canonical set of tags
 */
export const TAG_TAXONOMY: TagDefinition[] = [
  // ============================================
  // INDUSTRY TAGS
  // ============================================
  {
    slug: 'fire-safety',
    name: 'Fire & Life Safety',
    category: 'industry',
    description: 'Flatirons Capital Advisors has completed over a dozen transactions in the fire and life safety industry, establishing deep expertise in this fragmented sector. FCA has facilitated sales to leading acquirers including Audax-backed Academy Fire (AI Fire), API Group, Marmic Fire & Safety, Protegis Fire & Safety, and Millennium Fire Protection, representing companies from coast to coast specializing in fire inspection, sprinkler installation, alarm systems, and comprehensive life safety services.',
    keywords: ['fire', 'sprinkler', 'life safety', 'fire protection', 'fire alarm', 'fire equipment'],
  },
  {
    slug: 'auto-repair',
    name: 'Auto Repair',
    category: 'industry',
    description: 'Flatirons Capital Advisors has become a trusted advisor in the automotive aftermarket sector, completing numerous transactions with O2 Capital-backed Straightaway Tire & Auto and other strategic buyers. FCA has represented auto repair shops across Colorado, Minnesota, New Hampshire, and other states, helping owners achieve successful exits while their businesses join growing regional and national platforms focused on tire, maintenance, and general automotive repair services.',
    keywords: ['auto repair', 'automotive', 'car care', 'tire', 'auto service', 'auto maintenance'],
  },
  {
    slug: 'collision-repair',
    name: 'Collision & Auto Body',
    category: 'industry',
    description: 'Flatirons Capital Advisors has advised collision repair and auto body shop owners on strategic sales to major consolidators in the industry. FCA-represented transactions include sales to Classic Collision (TPG-backed), CollisionRight (CenterOak Partners), and KAIZEN Collision Center, spanning markets from Colorado and Nevada to California and Maryland, helping family-owned body shops join sophisticated platforms while preserving their legacy of quality craftsmanship.',
    keywords: ['collision', 'auto body', 'body shop', 'paint', 'body repair'],
  },
  {
    slug: 'hvac',
    name: 'HVAC',
    category: 'industry',
    description: 'Flatirons Capital Advisors has extensive experience advising HVAC and home services companies on M&A transactions. FCA has facilitated sales to platforms including Prime Home Services Group, APEX Service Partners (Alpine Investors), Heartland Home Services (Cobepa Capital), and Trudela Capital, representing residential and commercial HVAC contractors in Colorado, Illinois, Indiana, and Texas who sought strategic partners to support continued growth.',
    keywords: ['hvac', 'heating', 'cooling', 'air conditioning', 'ventilation', 'furnace'],
  },
  {
    slug: 'plumbing',
    name: 'Plumbing',
    category: 'industry',
    description: 'Flatirons Capital Advisors has represented plumbing contractors in strategic M&A transactions, including sales to home services platforms like Prime Home Services Group and Heartland Home Services. FCA understands the unique value drivers in residential and commercial plumbing businesses, from recurring service agreements to skilled technician teams, and has helped owners in Colorado, Indiana, and other markets achieve successful transitions.',
    keywords: ['plumbing', 'plumber', 'pipe', 'drain'],
  },
  {
    slug: 'electrical',
    name: 'Electrical Services',
    category: 'industry',
    description: 'Flatirons Capital Advisors has advised electrical contractors and supply distributors on strategic transactions, including ATI Electrical Supply (merged with Connecticut Electric Manufacturing) and Cummings Electric. FCA understands the value of established customer relationships, skilled electrician teams, and distribution networks in this essential trades sector, representing companies in Florida, Vermont, and other markets.',
    keywords: ['electrical', 'electric', 'electrician', 'wiring'],
  },
  {
    slug: 'environmental',
    name: 'Environmental Services',
    category: 'industry',
    description: 'Flatirons Capital Advisors has developed significant expertise in environmental consulting and ecological services M&A. FCA has represented firms including biome Consulting Group (sold to UES), Ecological Resource Consultants (Western States Reclamation), Stratified Environmental (PaleoWest), SWC (Resource Environmental Solutions), and IVA Environmental, advising companies specializing in wetland permitting, habitat conservation, environmental surveys, and regulatory compliance across Florida and Colorado.',
    keywords: ['environmental', 'ecological', 'reclamation', 'wetland', 'habitat', 'conservation'],
  },
  {
    slug: 'it-technology',
    name: 'IT & Technology',
    category: 'industry',
    description: 'Flatirons Capital Advisors has advised technology companies and managed service providers on strategic exits, including PEI (sold to Dataprise/Trinity Hunt), Zunesis (Absolute Performance/Seaside Equity), Remote Learner (Learning Pool), Ceres Technology Group (All Copy Products), and PCS Mobile (Route1). Based in Colorado, FCA has deep connections in the Boulder-Denver tech corridor and understands the value of recurring revenue, technical talent, and client relationships in IT services.',
    keywords: ['technology', 'it consulting', 'msp', 'software', 'managed service', 'cybersecurity', 'it services'],
  },
  {
    slug: 'petroleum',
    name: 'Petroleum & Lubricants',
    category: 'industry',
    description: 'Flatirons Capital Advisors has represented petroleum and lubricant distributors in strategic transactions, including AEG Petroleum (partnered with Plexus Capital) and New West Oil Company (sold to RelaDyne/Audax). FCA understands the distribution economics, customer relationships, and operational dynamics of fuel and lubricant businesses across Texas, Arizona, and other energy-intensive markets.',
    keywords: ['petroleum', 'lubricant', 'fuel', 'oil distribution', 'lube'],
  },
  {
    slug: 'oil-gas',
    name: 'Oil & Gas',
    category: 'industry',
    description: 'Flatirons Capital Advisors has completed numerous transactions in the oil and gas services sector, particularly in the Permian Basin and other major energy markets. FCA has represented companies including SWM International (perforating guns), BBB Tank Services, Colorado Lining International (geomembrane liners sold to Raven Industries), and various oilfield equipment manufacturers, helping owners navigate the cyclical energy industry to achieve successful exits.',
    keywords: ['oil', 'gas', 'drilling', 'fracking', 'well', 'oilfield', 'seismic'],
  },
  {
    slug: 'refrigeration',
    name: 'Refrigeration',
    category: 'industry',
    description: 'Flatirons Capital Advisors has advised commercial and industrial refrigeration companies on strategic sales, including Coldstar Inc. and North American Refrigeration (both sold to Preston Refrigeration). FCA understands the technical expertise and specialized capabilities required in ammonia refrigeration systems, cold storage, and commercial refrigeration services across Florida and other markets.',
    keywords: ['refrigeration', 'cold storage', 'ammonia', 'cooling system'],
  },
  {
    slug: 'pool-spa',
    name: 'Pool & Spa',
    category: 'industry',
    description: 'Flatirons Capital Advisors has advised pool and spa service companies on strategic transactions, including Precision Pool & Spa (sold to O2 Capital-backed Azureon). FCA understands the recurring revenue models, seasonal dynamics, and growth opportunities in the pool and spa design, construction, and maintenance industry, helping owners in New York and other markets find the right strategic partners.',
    keywords: ['pool', 'spa', 'swimming'],
  },
  {
    slug: 'roofing',
    name: 'Roofing',
    category: 'industry',
    description: 'Flatirons Capital Advisors has represented roofing contractors in M&A transactions, including MEC (sold to Trive Capital-backed Curb Home Solutions). FCA understands the value drivers in residential and commercial roofing businesses, from installation crews to storm damage repair capabilities, and helps owners in California and other markets achieve successful exits to growing regional platforms.',
    keywords: ['roofing', 'roof', 'siding', 'shingle'],
  },
  {
    slug: 'healthcare',
    name: 'Healthcare',
    category: 'industry',
    description: 'Flatirons Capital Advisors has advised healthcare services companies across multiple sub-sectors, including thriveMD (concierge medicine, sold to Boyne Capital-backed Novellum Longevity), Rocky Mountain Medical Equipment (DME), and multiple retail pharmacy transactions with Walgreens and CVS. FCA brings expertise in healthcare valuations, regulatory considerations, and the unique dynamics of medical service businesses.',
    keywords: ['healthcare', 'medical', 'doctor', 'pharmacy', 'drug', 'health', 'longevity', 'stem cell', 'dme'],
  },
  {
    slug: 'advertising',
    name: 'Advertising & Marketing',
    category: 'industry',
    description: 'Flatirons Capital Advisors has completed multiple transactions in the advertising agency sector, including Marc USA, BLR Further, Asher Agency, and The Arnold Agency, facilitating Eastport Holdings consolidation strategy. FCA understands the creative industry dynamics, client relationships, and recurring revenue streams that drive value in advertising and marketing services firms.',
    keywords: ['advertising', 'marketing', 'agency', 'media', 'digital advertising'],
  },
  {
    slug: 'transportation',
    name: 'Transportation & Logistics',
    category: 'industry',
    description: 'Flatirons Capital Advisors has represented transportation and logistics companies in strategic transactions, including Majewski Transportation (trucking, sold to River Horse Logistics), Colorado Storage Systems (trailer rentals, sold to American Trailer Rental Group), and Johnston\'s Corner (iconic Colorado truck stop, sold to Travel Centers of America). FCA understands fleet operations, logistics networks, and the capital-intensive nature of the transportation industry.',
    keywords: ['trucking', 'logistics', 'transportation', 'freight', '3pl', 'warehousing', 'trailer'],
  },
  {
    slug: 'manufacturing',
    name: 'Manufacturing',
    category: 'industry',
    description: 'Flatirons Capital Advisors has advised manufacturing companies on strategic exits, including Uniform Technology (safety equipment, sold to PIP/Audax), Whitworth Tool (precision machining), and various oilfield equipment manufacturers. FCA understands the value of proprietary processes, skilled workforces, and customer relationships in manufacturing businesses across diverse end markets.',
    keywords: ['manufacturing', 'fabrication', 'machining', 'cnc', 'precision', 'equipment manufacturer'],
  },
  {
    slug: 'distribution',
    name: 'Distribution',
    category: 'industry',
    description: 'Flatirons Capital Advisors has represented distribution companies in M&A transactions, including Strategic Merchandise Group and KMS Inc. (wholesale consumer products, New State Capital Partners), ATI Electrical Supply, and World Resources Distribution (window and door materials). FCA understands inventory management, supplier relationships, and logistics optimization that drive value in distribution businesses.',
    keywords: ['distribution', 'distributor', 'wholesale', 'supply'],
  },
  {
    slug: 'construction',
    name: 'Construction & Building',
    category: 'industry',
    description: 'Flatirons Capital Advisors has advised construction trades and building materials companies on strategic transactions, including electrical contractors, custom cabinet manufacturers like Pacific Cabinets (ESOP), and building products distributors. FCA understands the project-based revenue, skilled labor requirements, and market dynamics of the construction industry.',
    keywords: ['construction', 'building', 'contractor', 'cabinet', 'window', 'door'],
  },
  {
    slug: 'retail',
    name: 'Retail',
    category: 'industry',
    description: 'Flatirons Capital Advisors has represented specialty retail businesses in strategic transactions, including Another Line Inc. (designer handbags, sold to Kinderhook-backed Lodis Accessories), Breckenridge Ski Enterprises (ski apparel, sold to Vail Resorts), and Key Enterprises (licensed accessories). FCA understands brand value, inventory management, and the evolving retail landscape.',
    keywords: ['retail', 'store', 'shop', 'consumer products', 'apparel', 'accessories'],
  },
  {
    slug: 'engineering',
    name: 'Engineering',
    category: 'industry',
    description: 'Flatirons Capital Advisors has advised engineering and infrastructure consulting firms on M&A transactions, including Murraysmith Inc. (infrastructure engineering, sold to Keystone Capital-backed CONSOR). FCA understands the value of technical expertise, project backlogs, and client relationships in engineering services firms specializing in water, transportation, and infrastructure.',
    keywords: ['engineering', 'infrastructure', 'civil', 'design'],
  },
  {
    slug: 'business-services',
    name: 'Business Services',
    category: 'industry',
    description: 'Flatirons Capital Advisors has represented business services companies in strategic transactions, including OnePoint BPO Services (recapitalization) and JOBS/AMST (commercial window cleaning and elevator modernization, sold to Keystone Capital). FCA understands recurring contract value, operational scalability, and client retention dynamics in B2B services.',
    keywords: ['bpo', 'business process', 'professional services', 'consulting', 'outsourcing'],
  },
  {
    slug: 'travel-hospitality',
    name: 'Travel & Hospitality',
    category: 'industry',
    description: 'Flatirons Capital Advisors has advised travel and hospitality companies on strategic exits, including IQDestinations and Bid4Vacations.com (online travel agencies). FCA understands the technology platforms, booking economics, and customer acquisition strategies that drive value in the travel industry.',
    keywords: ['travel', 'hospitality', 'hotel', 'tourism', 'vacation'],
  },
  {
    slug: 'aerospace-defense',
    name: 'Aerospace & Defense',
    category: 'industry',
    description: 'Flatirons Capital Advisors has represented aerospace and defense contractors in M&A transactions, including SimAuthor Inc. (sold to Westar Aerospace & Defense Group). FCA understands security clearance requirements, government contracting processes, and the specialized technology solutions valued in the defense sector.',
    keywords: ['aerospace', 'defense', 'military', 'government', 'dod'],
  },

  // ============================================
  // SERVICE TYPE TAGS
  // ============================================
  {
    slug: 'home-services',
    name: 'Home Services',
    category: 'service-type',
    description: 'Flatirons Capital Advisors has extensive experience advising residential home services companies, including HVAC contractors, plumbers, pool service providers, and lawn care businesses. FCA has facilitated sales to major home services platforms including Prime Home Services Group, Heartland Home Services, Trudela Capital, Ned Stevens Home Care, and Azureon, helping owners of residential-focused businesses find partners committed to maintaining service quality while providing growth capital.',
    keywords: ['home service', 'residential', 'homeowner'],
  },
  {
    slug: 'commercial-services',
    name: 'Commercial Services',
    category: 'service-type',
    description: 'Flatirons Capital Advisors has represented numerous commercial services businesses in M&A transactions, from fire protection and refrigeration to environmental consulting and IT services. FCA understands the B2B sales cycles, contract structures, and customer concentration dynamics that drive valuations in commercial services, helping business owners negotiate successful exits with strategic and financial buyers.',
    keywords: ['commercial', 'business', 'b2b', 'enterprise'],
  },

  // ============================================
  // DEAL TYPE TAGS
  // ============================================
  {
    slug: 'acquisition',
    name: 'Acquisition',
    category: 'deal-type',
    description: 'Flatirons Capital Advisors has facilitated over 90 successful acquisitions, representing sellers in transactions ranging from $5 million to over $100 million in enterprise value. FCA\'s process-driven approach ensures competitive outcomes, with most transactions involving multiple qualified bidders and achieving premium valuations for business owners ready to exit or seek growth capital.',
    keywords: ['acqui', 'merger', 'acquisition', 'acquired', 'acquires'],
  },
  {
    slug: 'private-equity',
    name: 'Private Equity',
    category: 'deal-type',
    description: 'Flatirons Capital Advisors has completed transactions with dozens of leading private equity firms, including Audax Private Equity, Alpine Investors, TPG, Cobepa Capital, New State Capital Partners, Keystone Capital, and many others. FCA understands PE investment criteria, due diligence requirements, and deal structures, helping sellers navigate the private equity landscape to find the right financial partner.',
    keywords: ['private equity', 'pe firm', 'pe-backed', 'portfolio company', 'capital partners'],
  },
  {
    slug: 'platform-add-on',
    name: 'Platform Add-On',
    category: 'deal-type',
    description: 'Flatirons Capital Advisors has extensive experience representing sellers in add-on acquisitions to PE-backed platform companies. FCA has facilitated numerous add-on transactions to platforms including Academy Fire (Audax), Straightaway Tire & Auto (O2 Capital), KAIZEN Collision, Marmic Fire & Safety, Heartland Home Services, and many others, helping business owners join established platforms while often achieving premium valuations.',
    keywords: ['add-on', 'platform', 'tuck-in', 'bolt-on'],
  },
  {
    slug: 'recapitalization',
    name: 'Recapitalization',
    category: 'deal-type',
    description: 'Flatirons Capital Advisors has advised business owners on recapitalizations and alternative transaction structures, including the recapitalization of OnePoint BPO Services and ESOP transactions like Pacific Cabinets Inc. FCA helps owners explore options beyond outright sales, including partial liquidity events, management buyouts, and employee ownership structures that preserve legacy while providing capital and succession solutions.',
    keywords: ['recapitalization', 'recap', 'esop', 'equity'],
  },
];

/**
 * Map of slug to tag definition for quick lookup
 */
export const TAG_MAP: Record<string, TagDefinition> = TAG_TAXONOMY.reduce(
  (acc, tag) => {
    acc[tag.slug] = tag;
    return acc;
  },
  {} as Record<string, TagDefinition>
);

/**
 * Maps raw industry values from CSV to normalized tag slugs
 * This ensures consistent tagging regardless of how the industry was entered
 */
export const INDUSTRY_TO_TAGS: Record<string, string[]> = {
  // Fire & Safety
  'Fire & life safety': ['fire-safety'],
  'fire & life safety': ['fire-safety'],
  
  // Automotive
  'Auto Repair': ['auto-repair'],
  'auto repair': ['auto-repair'],
  'Auto Body Repair': ['collision-repair'],
  'auto body repair': ['collision-repair'],
  
  // HVAC & Plumbing
  'HVAC': ['hvac'],
  'hvac': ['hvac'],
  'Residential HVAC': ['hvac', 'home-services'],
  'residential hvac': ['hvac', 'home-services'],
  'Plumbing & HVAC': ['plumbing', 'hvac'],
  'plumbing & hvac': ['plumbing', 'hvac'],
  
  // Electrical
  'Electrical Contractor': ['electrical', 'construction'],
  'electrical contractor': ['electrical', 'construction'],
  'Electrical Supply': ['electrical', 'distribution'],
  'electrical supply': ['electrical', 'distribution'],
  
  // Environmental
  'Environmental consulting': ['environmental'],
  'environmental consulting': ['environmental'],
  'Reclamation Services': ['environmental'],
  'reclamation services': ['environmental'],
  
  // IT & Technology
  'IT Consulting': ['it-technology'],
  'it consulting': ['it-technology'],
  'Telecommunications': ['it-technology'],
  'telecommunications': ['it-technology'],
  'Online learning solutions': ['it-technology'],
  'online learning solutions': ['it-technology'],
  'BPO services': ['business-services', 'it-technology'],
  'bpo services': ['business-services', 'it-technology'],
  
  // Petroleum & Energy
  'Petroleum & Lubricant Distributor': ['petroleum', 'distribution'],
  'petroleum & lubricant distributor': ['petroleum', 'distribution'],
  'Oil & Gas equipment rental': ['oil-gas'],
  'oil & gas equipment rental': ['oil-gas'],
  'Manufacturer of perforating guns': ['oil-gas', 'manufacturing'],
  'manufacturer of perforating guns': ['oil-gas', 'manufacturing'],
  'Well Logging': ['oil-gas'],
  'well logging': ['oil-gas'],
  'Oil well equipment': ['oil-gas', 'manufacturing'],
  'oil well equipment': ['oil-gas', 'manufacturing'],
  'Tank construction': ['oil-gas', 'construction'],
  'tank construction': ['oil-gas', 'construction'],
  'Seismic services': ['oil-gas'],
  'seismic services': ['oil-gas'],
  'Geomembrane Liners': ['oil-gas', 'manufacturing'],
  'geomembrane liners': ['oil-gas', 'manufacturing'],
  'Pipe casing': ['oil-gas', 'manufacturing'],
  'pipe casing': ['oil-gas', 'manufacturing'],
  
  // Refrigeration
  'Commercial refrigeration': ['refrigeration', 'commercial-services'],
  'commercial refrigeration': ['refrigeration', 'commercial-services'],
  
  // Pool & Spa
  'Pool & Spa Service': ['pool-spa', 'home-services'],
  'pool & spa service': ['pool-spa', 'home-services'],
  
  // Roofing
  'Residential Roofing': ['roofing', 'home-services'],
  'residential roofing': ['roofing', 'home-services'],
  
  // Healthcare
  'Concierge Doctor': ['healthcare'],
  'concierge doctor': ['healthcare'],
  'DME': ['healthcare'],
  'dme': ['healthcare'],
  'retail pharmacy': ['healthcare', 'retail'],
  'Retail pharmacy': ['healthcare', 'retail'],
  
  // Advertising
  'Advertising agency': ['advertising'],
  'advertising agency': ['advertising'],
  
  // Transportation
  'Trucking Company': ['transportation'],
  'trucking company': ['transportation'],
  'Trailer Rentals': ['transportation', 'commercial-services'],
  'trailer rentals': ['transportation', 'commercial-services'],
  'Truck Stop & Café': ['transportation', 'retail'],
  'truck stop & café': ['transportation', 'retail'],
  'Travel Agency': ['travel-hospitality'],
  'travel agency': ['travel-hospitality'],
  
  // Manufacturing
  'Precision Machining': ['manufacturing'],
  'precision machining': ['manufacturing'],
  'Drilling Rig Equipment Manufacturer': ['oil-gas', 'manufacturing'],
  'drilling rig equipment manufacturer': ['oil-gas', 'manufacturing'],
  'Safety Equipment & clothing': ['manufacturing', 'distribution'],
  'safety equipment & clothing': ['manufacturing', 'distribution'],
  
  // Construction & Building
  'Custom cabinets': ['construction'],
  'custom cabinets': ['construction'],
  'Window and Door Materials': ['construction', 'distribution'],
  'window and door materials': ['construction', 'distribution'],
  'Kitchen cabinets & appliances': ['construction', 'retail'],
  'kitchen cabinets & appliances': ['construction', 'retail'],
  
  // Distribution & Wholesale
  'Wholesale consumer products': ['distribution', 'retail'],
  'wholesale consumer products': ['distribution', 'retail'],
  
  // Retail
  'Designer Handbags': ['retail'],
  'designer handbags': ['retail'],
  'Licensed accessories': ['retail'],
  'licensed accessories': ['retail'],
  'Retail ski apparrel': ['retail'],
  'retail ski apparrel': ['retail'],
  'Copy service & printers': ['retail', 'business-services'],
  'copy service & printers': ['retail', 'business-services'],
  'Promotional Products, print services': ['retail', 'business-services'],
  'promotional products, print services': ['retail', 'business-services'],
  'Audio video equipment': ['retail', 'it-technology'],
  'audio video equipment': ['retail', 'it-technology'],
  
  // Engineering
  'Engineering Firm': ['engineering'],
  'engineering firm': ['engineering'],
  
  // Business Services
  'Comercial Window Cleaning / Elevator modernization': ['commercial-services'],
  'comercial window cleaning / elevator modernization': ['commercial-services'],
  'Waste Management': ['commercial-services'],
  'waste management': ['commercial-services'],
  
  // Aerospace
  'Aerospace': ['aerospace-defense'],
  'aerospace': ['aerospace-defense'],
};

/**
 * Get tags for a tombstone based on its industry and keywords
 */
export function getTombstoneTags(industry: string, keywords?: string): string[] {
  const tags: Set<string> = new Set();
  
  // 1. Map industry to canonical tags
  const industryKey = industry.trim();
  const mappedTags = INDUSTRY_TO_TAGS[industryKey] || INDUSTRY_TO_TAGS[industryKey.toLowerCase()];
  
  if (mappedTags) {
    mappedTags.forEach(tag => tags.add(tag));
  } else if (industry) {
    // Fallback: try to match keywords in the industry name
    const industryLower = industry.toLowerCase();
    for (const tagDef of TAG_TAXONOMY) {
      if (tagDef.keywords.some(kw => industryLower.includes(kw))) {
        tags.add(tagDef.slug);
      }
    }
  }
  
  // 2. Extract additional tags from keywords
  if (keywords) {
    const keywordsLower = keywords.toLowerCase();
    for (const tagDef of TAG_TAXONOMY) {
      if (tagDef.keywords.some(kw => keywordsLower.includes(kw))) {
        tags.add(tagDef.slug);
      }
    }
  }
  
  return Array.from(tags);
}

/**
 * Extract tags from news article content
 */
export function getArticleTags(title: string, content: string): string[] {
  const text = `${title} ${content}`.toLowerCase();
  const tags: Set<string> = new Set();
  
  for (const tagDef of TAG_TAXONOMY) {
    if (tagDef.keywords.some(kw => text.includes(kw))) {
      tags.add(tagDef.slug);
    }
  }
  
  return Array.from(tags);
}

/**
 * Get display name for a tag slug
 */
export function getTagDisplayName(slug: string): string {
  return TAG_MAP[slug]?.name || slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/**
 * Get all tags for a given category
 */
export function getTagsByCategory(category: TagDefinition['category']): TagDefinition[] {
  return TAG_TAXONOMY.filter(tag => tag.category === category);
}
