/**
 * CSV generation utility for lead exports.
 */

interface CsvColumnDef {
  key: string;
  header: string;
  accessor: (lead: any) => string;
}

/** Escape a value for CSV: wrap in quotes if it contains commas, quotes, or newlines */
function escapeCsvValue(value: unknown): string {
  if (value == null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function extractJsonText(val: unknown): string {
  if (val == null) return '';
  if (typeof val === 'object') return (val as any).text ?? '';
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      return parsed.text ?? val;
    } catch {
      return val;
    }
  }
  return '';
}

const allColumnDefs: CsvColumnDef[] = [
  // Core
  { key: 'name', header: 'Name', accessor: (l) => l.name ?? '' },
  { key: 'address', header: 'Address', accessor: (l) => l.address ?? '' },
  { key: 'city', header: 'City', accessor: (l) => l.locationCity?.name ?? '' },
  { key: 'state', header: 'State', accessor: (l) => l.locationState?.name ?? '' },
  { key: 'zipCode', header: 'Zip Code', accessor: (l) => l.zipCode ?? '' },
  { key: 'phone', header: 'Phone', accessor: (l) => l.phone ?? '' },
  { key: 'website', header: 'Website', accessor: (l) => l.website ?? '' },
  { key: 'googleMapsUri', header: 'Google Maps URL', accessor: (l) => l.googleMapsUri ?? '' },

  // Google Places
  { key: 'rating', header: 'Rating', accessor: (l) => l.rating != null ? String(l.rating) : '' },
  { key: 'reviewCount', header: 'Review Count', accessor: (l) => l.reviewCount != null ? String(l.reviewCount) : '' },
  { key: 'priceLevel', header: 'Price Level', accessor: (l) => l.priceLevel ?? '' },
  { key: 'businessType', header: 'Business Type', accessor: (l) => l.businessType ?? '' },
  { key: 'businessStatus', header: 'Business Status', accessor: (l) => l.businessStatus ?? '' },
  { key: 'latitude', header: 'Latitude', accessor: (l) => l.latitude != null ? String(l.latitude) : '' },
  { key: 'longitude', header: 'Longitude', accessor: (l) => l.longitude != null ? String(l.longitude) : '' },
  { key: 'editorialSummary', header: 'Editorial Summary', accessor: (l) => extractJsonText(l.editorialSummary) },
  { key: 'reviewSummary', header: 'Review Summary', accessor: (l) => extractJsonText(l.reviewSummary) },
  { key: 'source', header: 'Source', accessor: (l) => l.source ?? '' },

  // AI Scoring
  { key: 'compositeScore', header: 'Composite Score', accessor: (l) => l.compositeScore != null ? String(l.compositeScore) : '' },
  { key: 'businessQualityScore', header: 'Business Quality Score', accessor: (l) => l.businessQualityScore != null ? String(l.businessQualityScore) : '' },
  { key: 'exitReadinessScore', header: 'Exit Readiness Score', accessor: (l) => l.exitReadinessScore != null ? String(l.exitReadinessScore) : '' },
  { key: 'qualityPercentileByType', header: 'Quality Percentile (Type)', accessor: (l) => l.qualityPercentileByType != null ? String(l.qualityPercentileByType) : '' },
  { key: 'qualityPercentileByCity', header: 'Quality Percentile (City)', accessor: (l) => l.qualityPercentileByCity != null ? String(l.qualityPercentileByCity) : '' },
  { key: 'exitPercentileByType', header: 'Exit Percentile (Type)', accessor: (l) => l.exitPercentileByType != null ? String(l.exitPercentileByType) : '' },
  { key: 'exitPercentileByCity', header: 'Exit Percentile (City)', accessor: (l) => l.exitPercentileByCity != null ? String(l.exitPercentileByCity) : '' },
  { key: 'controllingOwner', header: 'Controlling Owner', accessor: (l) => l.controllingOwner ?? '' },
  { key: 'ownershipType', header: 'Ownership Type', accessor: (l) => l.ownershipType ?? '' },
  { key: 'isExcluded', header: 'Is Excluded', accessor: (l) => l.isExcluded ? 'Yes' : 'No' },
  { key: 'exclusionReason', header: 'Exclusion Reason', accessor: (l) => l.exclusionReason ?? '' },
  { key: 'scoringRationale', header: 'Scoring Rationale', accessor: (l) => l.scoringRationale ?? '' },
  { key: 'scoredAt', header: 'Scored At', accessor: (l) => l.scoredAt ? new Date(l.scoredAt).toISOString() : '' },

  // Scraping
  { key: 'webScrapedAt', header: 'Web Scraped At', accessor: (l) => l.webScrapedAt ? new Date(l.webScrapedAt).toISOString() : '' },
  { key: 'contactPageUrl', header: 'Contact Page URL', accessor: (l) => l.contactPageUrl ?? '' },
  { key: 'pipelineStatus', header: 'Pipeline Status', accessor: (l) => l.pipelineStatus ?? '' },

  // Extracted data (multi-value joined with semicolons)
  { key: 'emails', header: 'Emails', accessor: (l) => (l.leadEmails ?? []).map((e: any) => e.value).join('; ') },
  { key: 'phones', header: 'Phones', accessor: (l) => (l.leadPhones ?? []).map((p: any) => p.value).join('; ') },
  { key: 'socialProfiles', header: 'Social Profiles', accessor: (l) => (l.leadSocialProfiles ?? []).map((s: any) => s.url).join('; ') },

  // Relations
  { key: 'campaignName', header: 'Campaign', accessor: (l) => l.campaign?.name ?? '' },
  { key: 'franchiseName', header: 'Franchise', accessor: (l) => l.franchise?.displayName ?? l.franchise?.name ?? '' },

  // Meta
  { key: 'createdAt', header: 'Created At', accessor: (l) => l.createdAt ? new Date(l.createdAt).toISOString() : '' },
  { key: 'updatedAt', header: 'Updated At', accessor: (l) => l.updatedAt ? new Date(l.updatedAt).toISOString() : '' },
];

const columnDefMap = new Map(allColumnDefs.map((c) => [c.key, c]));

/** All valid export column keys */
export const exportColumnKeys = allColumnDefs.map((c) => c.key);

/**
 * Generate a CSV string from leads and selected column keys.
 */
export function generateCsv(leads: any[], columns: string[]): string {
  const defs = columns
    .map((key) => columnDefMap.get(key))
    .filter((d): d is CsvColumnDef => d != null);

  if (defs.length === 0) {
    throw new Error('No valid columns selected');
  }

  const header = defs.map((d) => escapeCsvValue(d.header)).join(',');
  const rows = leads.map((lead) =>
    defs.map((d) => escapeCsvValue(d.accessor(lead))).join(',')
  );

  return [header, ...rows].join('\n');
}
