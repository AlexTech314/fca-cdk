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
  'website',
  'rating',
  'businessType',
  'priorityScore',
  'priorityTier',
];

export const LEAD_COLUMN_OPTIONS: LeadColumnOption[] = [
  { key: 'name', label: 'Name' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'phone', label: 'Phone' },
  { key: 'emails', label: 'Emails' },
  { key: 'website', label: 'Website' },
  { key: 'googleMaps', label: 'Google Maps' },
  { key: 'rating', label: 'Rating' },
  { key: 'businessType', label: 'Type' },
  { key: 'priorityScore', label: 'Score' },
  { key: 'priorityTier', label: 'Tier' },
  { key: 'headcountEstimate', label: 'Headcount' },
  { key: 'foundedYear', label: 'Founded' },
  { key: 'yearsInBusiness', label: 'Years' },
  { key: 'hasAcquisitionSignal', label: 'Acquisition' },
  { key: 'webScrapedAt', label: 'Scraped' },
  { key: 'createdAt', label: 'Added' },
];

export const LEAD_COLUMNS_STORAGE_KEY = 'lead-table-columns-v1';
