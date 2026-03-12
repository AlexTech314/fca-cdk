export interface ExtractionResult {
  owner_names: string[];
  first_name_only_contacts: string[];
  intermediation_signals: string[];
  management_titles: { name: string; title: string }[];
  team_members_named: number;
  team_member_names: string[];
  years_in_business: number | null;
  founded_year: number | null;
  services: string[];
  has_commercial_clients: boolean;
  commercial_client_names: string[];
  certifications: string[];
  location_count: number;
  pricing_signals: string[];
  copyright_year: number | null;
  website_quality: string;
  red_flags: string[];
  testimonial_count: number;
  recurring_revenue_signals: string[];
  notable_quotes: { url: string; text: string }[];
  succession_signals: string[];
  process_governance_signals: string[];
  competitive_pressure_signals: string[];
  growth_vs_maintenance_language: string;
  customer_base: 'b2b' | 'b2c' | 'mixed' | 'unknown';
  licensing_bonding: string[];
  scale_indicators: string[];
  industry_affiliations: string[];
}

export const EMPTY_EXTRACTION: ExtractionResult = {
  owner_names: [],
  first_name_only_contacts: [],
  intermediation_signals: [],
  management_titles: [],
  team_members_named: 0,
  team_member_names: [],
  years_in_business: null,
  founded_year: null,
  services: [],
  has_commercial_clients: false,
  commercial_client_names: [],
  certifications: [],
  location_count: 0,
  pricing_signals: [],
  copyright_year: null,
  website_quality: 'none',
  red_flags: ['No website data available'],
  testimonial_count: 0,
  recurring_revenue_signals: [],
  notable_quotes: [],
  succession_signals: [],
  process_governance_signals: [],
  competitive_pressure_signals: [],
  growth_vs_maintenance_language: 'unknown',
  customer_base: 'unknown',
  licensing_bonding: [],
  scale_indicators: [],
  industry_affiliations: [],
};

export interface ExtractionPassA {
  owner_names: string[];
  first_name_only_contacts: string[];
  management_titles: { name: string; title: string }[];
  team_members_named: number;
  team_member_names: string[];
  years_in_business: number | null;
  founded_year: number | null;
  services: string[];
  location_count: number;
  customer_base: 'b2b' | 'b2c' | 'mixed' | 'unknown';
  website_quality: string;
  copyright_year: number | null;
  testimonial_count: number;
}

export interface ExtractionPassB {
  intermediation_signals: string[];
  succession_signals: string[];
  process_governance_signals: string[];
  competitive_pressure_signals: string[];
  growth_vs_maintenance_language: string;
  recurring_revenue_signals: string[];
}

export interface ExtractionPassC {
  has_commercial_clients: boolean;
  commercial_client_names: string[];
  certifications: string[];
  pricing_signals: string[];
  red_flags: string[];
  licensing_bonding: string[];
  scale_indicators: string[];
  industry_affiliations: string[];
  notable_quotes: { url: string; text: string }[];
}

export interface BatchItem {
  lead_id: string;
  place_id: string;
}

export interface ScoringResult {
  controlling_owner: string | null;
  ownership_type: string;
  is_excluded: boolean;
  exclusion_reason: string | null;
  business_quality_score: number;
  exit_readiness_score: number;
  rationale: string;
  supporting_evidence: { url: string; snippet: string }[];
  is_intermediated: boolean;
  intermediation_signals_summary: string | null;
  owner_email: string | null;
  owner_phone: string | null;
  owner_linkedin: string | null;
  contact_confidence: 'confirmed' | 'likely' | 'research_required' | null;
}

/** Percentile thresholds for review counts — 23 breakpoints from p0 to p99.9 */
export const RC_PERCENTILES = [0, 1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 99, 99.9] as const;
export const RC_KEYS = ['rcP00','rcP01','rcP05','rcP10','rcP15','rcP20','rcP25','rcP30','rcP35','rcP40','rcP45','rcP50','rcP55','rcP60','rcP65','rcP70','rcP75','rcP80','rcP85','rcP90','rcP95','rcP99','rcP999'] as const;

export interface MarketStats {
  leadCount: number;
  rcP00: number; rcP01: number; rcP05: number; rcP10: number; rcP15: number;
  rcP20: number; rcP25: number; rcP30: number; rcP35: number; rcP40: number;
  rcP45: number; rcP50: number; rcP55: number; rcP60: number; rcP65: number;
  rcP70: number; rcP75: number; rcP80: number; rcP85: number; rcP90: number;
  rcP95: number; rcP99: number; rcP999: number;
  ratingMean: number;
  ratingMedian: number;
}
