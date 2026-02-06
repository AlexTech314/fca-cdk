import { analyticsRepository } from '../repositories/analytics.repository';
import type { PageViewInput, AnalyticsQuery } from '../models/analytics.model';

export const analyticsService = {
  async recordPageView(data: PageViewInput) {
    return analyticsRepository.recordPageView(data);
  },

  async getPageViews(query: AnalyticsQuery) {
    return analyticsRepository.getPageViews(query);
  },

  async getTopPages(limit?: number) {
    return analyticsRepository.getTopPages(limit);
  },

  async getTrends(days?: number) {
    return analyticsRepository.getTrends(days);
  },

  async getTotalViews() {
    return analyticsRepository.getTotalViews();
  },
};
