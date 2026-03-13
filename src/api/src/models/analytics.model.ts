import { z } from 'zod';

// Record a page view + referrer
export const pageViewSchema = z.object({
  path: z.string().min(1, 'Path is required'),
  referrer: z.string().optional().default('direct'),
});

// Query analytics by time range
export const analyticsQuerySchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  path: z.string().optional(),
});

// Types
export type PageViewInput = z.infer<typeof pageViewSchema>;
export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;

export interface TimeSeriesPoint {
  bucket: string; // YYYY-MM-DDTHH:MM
  count: number;
}

export interface PageViewTimeSeries {
  path: string;
  data: TimeSeriesPoint[];
  total: number;
}

export interface ReferrerTimeSeries {
  source: string;
  data: TimeSeriesPoint[];
  total: number;
}

export interface TopPage {
  path: string;
  views: number;
}
