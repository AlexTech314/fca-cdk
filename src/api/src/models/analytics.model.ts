import { z } from 'zod';

// Page view tracking input
export const pageViewSchema = z.object({
  path: z.string().min(1, 'Path is required'),
});

// Analytics query params
export const analyticsQuerySchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  path: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// Page view stats response
export const pageViewStatsSchema = z.object({
  path: z.string(),
  totalViews: z.number(),
  lastViewed: z.date().nullable(),
});

// Trends response
export const trendsSchema = z.object({
  hour: z.date(),
  views: z.number(),
});

// Types
export type PageViewInput = z.infer<typeof pageViewSchema>;
export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;
export type PageViewStats = z.infer<typeof pageViewStatsSchema>;
export type TrendsData = z.infer<typeof trendsSchema>;
