import { prisma } from '../lib/prisma';
import type { AnalyticsQuery, PageViewInput } from '../models/analytics.model';

export const analyticsRepository = {
  async recordPageView(data: PageViewInput) {
    // Truncate to current hour
    const now = new Date();
    const hour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());

    // Upsert - increment count if exists
    await prisma.pageView.upsert({
      where: {
        path_hour: { path: data.path, hour },
      },
      update: {
        count: { increment: 1 },
      },
      create: {
        path: data.path,
        hour,
        count: 1,
      },
    });
  },

  async getPageViews(query: AnalyticsQuery) {
    const { startDate, endDate, path, limit } = query;

    const where: any = {};

    if (startDate || endDate) {
      where.hour = {};
      if (startDate) where.hour.gte = startDate;
      if (endDate) where.hour.lte = endDate;
    }
    if (path) {
      where.path = path;
    }

    const views = await prisma.pageView.groupBy({
      by: ['path'],
      where,
      _sum: { count: true },
      _max: { hour: true },
      orderBy: { _sum: { count: 'desc' } },
      take: limit,
    });

    return views.map((v) => ({
      path: v.path,
      totalViews: v._sum.count || 0,
      lastViewed: v._max.hour,
    }));
  },

  async getTopPages(limit = 20) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const views = await prisma.pageView.groupBy({
      by: ['path'],
      where: { hour: { gte: thirtyDaysAgo } },
      _sum: { count: true },
      orderBy: { _sum: { count: 'desc' } },
      take: limit,
    });

    return views.map((v) => ({
      path: v.path,
      views: v._sum.count || 0,
    }));
  },

  async getTrends(days = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const views = await prisma.pageView.findMany({
      where: { hour: { gte: startDate } },
      orderBy: { hour: 'asc' },
    });

    // Aggregate by hour
    const hourlyData: Record<string, number> = {};
    for (const view of views) {
      const key = view.hour.toISOString();
      hourlyData[key] = (hourlyData[key] || 0) + view.count;
    }

    return Object.entries(hourlyData).map(([hour, views]) => ({
      hour: new Date(hour),
      views,
    }));
  },

  async getTotalViews() {
    const result = await prisma.pageView.aggregate({
      _sum: { count: true },
    });
    return result._sum.count || 0;
  },
};
