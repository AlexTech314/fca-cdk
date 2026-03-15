/**
 * Shared column definitions for lead exports (CSV, Excel).
 */

export interface ExportColumnDef {
  key: string;
  header: string;
  accessor: (lead: any) => string;
}

export function extractJsonText(val: unknown): string {
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

export const allColumnDefs: ExportColumnDef[] = [
  // Core
  { key: 'name', header: 'Company', accessor: (l) => l.name ?? '' },
  { key: 'address', header: 'Address', accessor: (l) => l.address ?? '' },
  { key: 'city', header: 'City', accessor: (l) => l.locationCity?.name ?? '' },
  { key: 'state', header: 'State', accessor: (l) => l.locationState?.name ?? '' },
  { key: 'zipCode', header: 'Zip Code', accessor: (l) => l.zipCode ?? '' },
  { key: 'phone', header: 'Company Phone', accessor: (l) => l.phone ?? '' },
  { key: 'website', header: 'Website', accessor: (l) => l.website ?? '' },
  { key: 'googleMapsUri', header: 'Google Maps', accessor: (l) => l.googleMapsUri ?? '' },

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
  { key: 'compositeScore', header: 'Priority Score', accessor: (l) => l.compositeScore != null ? String(l.compositeScore) : '' },
  { key: 'businessQualityScore', header: 'Business Quality Score', accessor: (l) => l.businessQualityScore != null ? String(l.businessQualityScore) : '' },
  { key: 'exitReadinessScore', header: 'Exit Readiness Score', accessor: (l) => l.exitReadinessScore != null ? String(l.exitReadinessScore) : '' },
  { key: 'tier', header: 'Tier', accessor: (l) => l.tier != null ? String(l.tier) : '' },
  { key: 'isIntermediated', header: 'Is Intermediated', accessor: (l) => l.isIntermediated ? 'Yes' : 'No' },
  { key: 'intermediationSignals', header: 'Intermediation Signals', accessor: (l) => l.intermediationSignals ?? '' },
  { key: 'bestContactFirstName', header: 'Contact First Name', accessor: (l) => {
    const best = (l.leadContacts ?? []).find((c: any) => c.isBestContact);
    return best?.firstName ?? '';
  }},
  { key: 'bestContactLastName', header: 'Contact Last Name', accessor: (l) => {
    const best = (l.leadContacts ?? []).find((c: any) => c.isBestContact);
    return best?.lastName ?? '';
  }},
  { key: 'bestContactEmail', header: 'Contact Email', accessor: (l) => {
    const best = (l.leadContacts ?? []).find((c: any) => c.isBestContact);
    return best?.email ?? '';
  }},
  { key: 'bestContactPhone', header: 'Contact Phone', accessor: (l) => {
    const best = (l.leadContacts ?? []).find((c: any) => c.isBestContact);
    return best?.phone ?? '';
  }},
  { key: 'bestContactLinkedin', header: 'Contact LinkedIn', accessor: (l) => {
    const best = (l.leadContacts ?? []).find((c: any) => c.isBestContact);
    return best?.linkedin ?? '';
  }},
  { key: 'bestContactInstagram', header: 'Contact Instagram', accessor: (l) => {
    const best = (l.leadContacts ?? []).find((c: any) => c.isBestContact);
    return best?.instagram ?? '';
  }},
  { key: 'bestContactFacebook', header: 'Contact Facebook', accessor: (l) => {
    const best = (l.leadContacts ?? []).find((c: any) => c.isBestContact);
    return best?.facebook ?? '';
  }},
  { key: 'bestContactTwitter', header: 'Contact Twitter', accessor: (l) => {
    const best = (l.leadContacts ?? []).find((c: any) => c.isBestContact);
    return best?.twitter ?? '';
  }},
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
  { key: 'contacts', header: 'Contacts', accessor: (l) => (l.leadContacts ?? []).map((c: any) => {
    const name = [c.firstName, c.lastName].filter(Boolean).join(' ');
    const parts: string[] = [];
    if (name) parts.push(name);
    if (c.email) parts.push(c.email);
    if (c.phone) parts.push(c.phone);
    return parts.join(' ');
  }).join('; ') },

  // Relations
  { key: 'campaignName', header: 'Campaign', accessor: (l) => l.campaign?.name ?? '' },
  { key: 'franchiseName', header: 'Franchise', accessor: (l) => l.franchise?.displayName ?? l.franchise?.name ?? '' },

  // Meta
  { key: 'createdAt', header: 'Date Added', accessor: (l) => l.createdAt ? new Date(l.createdAt).toISOString() : '' },
  { key: 'updatedAt', header: 'Updated At', accessor: (l) => l.updatedAt ? new Date(l.updatedAt).toISOString() : '' },
];

export const columnDefMap = new Map(allColumnDefs.map((c) => [c.key, c]));

/** All valid export column keys */
export const exportColumnKeys = allColumnDefs.map((c) => c.key);
