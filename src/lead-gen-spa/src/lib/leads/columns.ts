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
  'qualificationScore',
];

export const LEAD_COLUMN_OPTIONS: LeadColumnOption[] = [
  { key: 'name', label: 'Name' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'phone', label: 'Phone' },
  { key: 'emails', label: 'Emails' },
  { key: 'website', label: 'Website' },
  { key: 'rating', label: 'Rating' },
  { key: 'businessType', label: 'Type' },
  { key: 'qualificationScore', label: 'Score' },
  { key: 'headcountEstimate', label: 'Headcount' },
  { key: 'foundedYear', label: 'Founded' },
  { key: 'yearsInBusiness', label: 'Years' },
  { key: 'hasAcquisitionSignal', label: 'Acquisition' },
  { key: 'webScrapedAt', label: 'Scraped' },
  { key: 'createdAt', label: 'Added' },
];

export const LEAD_COLUMNS_STORAGE_KEY = 'lead-table-columns-v1';
