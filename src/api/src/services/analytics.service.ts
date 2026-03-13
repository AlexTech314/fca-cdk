import { analyticsRepository } from '../repositories/analytics.repository';
import type { AnalyticsQuery } from '../models/analytics.model';

export const analyticsService = {
  async recordPageView(path: string, referrer: string) {
    await Promise.all([
      analyticsRepository.recordPageView(path),
      analyticsRepository.recordReferrer(referrer),
    ]);
  },

  async getPageViews(query: AnalyticsQuery) {
    const endDate = query.endDate || new Date();
    const startDate = query.startDate || new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

    if (query.path) {
      const data = await analyticsRepository.getPageViewsByPage(query.path, startDate, endDate);
      return [{ path: query.path, data, total: data.reduce((s, d) => s + d.count, 0) }];
    }

    return analyticsRepository.getAllPageViews(startDate, endDate);
  },

  async getReferrers(query: AnalyticsQuery) {
    const endDate = query.endDate || new Date();
    const startDate = query.startDate || new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    return analyticsRepository.getReferrers(startDate, endDate);
  },

  async getTopPages(days = 7) {
    return analyticsRepository.getTopPages(days);
  },
};
