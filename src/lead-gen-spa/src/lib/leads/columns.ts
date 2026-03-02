import type { LeadListField } from '@/types';

export interface LeadColumnOption {
  key: LeadListField;
  label: string;
}

export const DEFAULT_LEAD_COLUMNS: LeadListField[] = [
  'name',
  'city',
  'state',
  'phone',
  'emails',
  'rating',
  'reviewCount',
  'businessType',
  'compositeScore',
];

export const LEAD_COLUMN_OPTIONS: LeadColumnOption[] = [
  { key: 'name', label: 'Name' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'phone', label: 'Phone' },
  { key: 'emails', label: 'Emails' },
  { key: 'website', label: 'Website' },
  { key: 'googleMaps', label: 'Maps' },
  { key: 'rating', label: 'Rating' },
  { key: 'reviewCount', label: 'Reviews' },
  { key: 'businessType', label: 'Type' },
  { key: 'scrapedData', label: 'Scraped Data' },
  { key: 'extractedData', label: 'Extracted Data' },
  { key: 'businessQualityScore', label: 'Raw BQ' },
  { key: 'exitReadinessScore', label: 'Raw ER' },
  { key: 'compositeScore', label: 'Composite' },
  { key: 'webScrapedAt', label: 'Scraped' },
  { key: 'createdAt', label: 'Added' },
];

export const LEAD_COLUMNS_STORAGE_KEY = 'lead-table-columns-v10';
