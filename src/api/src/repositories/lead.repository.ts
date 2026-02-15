import { prisma } from '../lib/prisma';
import type { Prisma } from '@prisma/client';
import type { LeadQuery } from '../models/lead.model';

// Map sort field names from camelCase frontend to Prisma field names
const sortFieldMap: Record<string, string> = {
  createdAt: 'createdAt',
  name: 'name',
  city: 'city',
  state: 'state',
  rating: 'rating',
  qualificationScore: 'qualificationScore',
  businessType: 'businessType',
  reviewCount: 'reviewCount',
};

export const leadRepository = {
  async findMany(query: LeadQuery) {
    const { page, limit, sort, order, ...filters } = query;
    const skip = (page - 1) * limit;

    const where = buildWhereClause(filters);
    const orderByField = sortFieldMap[sort] || 'createdAt';

    const [items, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [orderByField]: order },
        include: {
          campaign: { select: { id: true, name: true } },
        },
      }),
      prisma.lead.count({ where }),
    ]);

    return {
      data: items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  async findById(id: string) {
    return prisma.lead.findUnique({
      where: { id },
      include: {
        campaign: true,
        campaignRun: true,
      },
    });
  },

  async findByPlaceId(placeId: string) {
    return prisma.lead.findUnique({
      where: { placeId },
    });
  },

  async count(filters: Omit<LeadQuery, 'page' | 'limit' | 'sort' | 'order'>) {
    const where = buildWhereClause(filters);
    return prisma.lead.count({ where });
  },

  async updateQualification(id: string, score: number, notes: string) {
    return prisma.lead.update({
      where: { id },
      data: {
        qualificationScore: score,
        qualificationNotes: notes,
        qualifiedAt: new Date(),
      },
    });
  },

  async getDistinctBusinessTypes() {
    const results = await prisma.lead.groupBy({
      by: ['businessType'],
      _count: { id: true },
      where: { businessType: { not: null } },
      orderBy: { _count: { id: 'desc' } },
    });
    return results.map((r) => ({
      name: r.businessType!,
      value: r._count.id,
    }));
  },

  async getDistinctStates() {
    const results = await prisma.lead.groupBy({
      by: ['state'],
      _count: { id: true },
      where: { state: { not: null } },
      orderBy: { _count: { id: 'desc' } },
    });
    return results.map((r) => ({
      name: r.state!,
      value: r._count.id,
    }));
  },

  async getLeadsOverTime(startDate: Date, endDate: Date) {
    // Group leads by day
    const results = await prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM leads
      WHERE created_at >= ${startDate} AND created_at <= ${endDate}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;
    return results.map((r) => ({
      timestamp: r.date,
      value: Number(r.count),
    }));
  },

  async getStats() {
    const [totalLeads, qualifiedLeads] = await Promise.all([
      prisma.lead.count(),
      prisma.lead.count({ where: { qualificationScore: { not: null } } }),
    ]);
    return { totalLeads, qualifiedLeads };
  },
};

function buildWhereClause(
  filters: Omit<LeadQuery, 'page' | 'limit' | 'sort' | 'order'>
): Prisma.LeadWhereInput {
  const where: Prisma.LeadWhereInput = {};

  if (filters.name) {
    where.name = { contains: filters.name, mode: 'insensitive' };
  }
  if (filters.city) {
    where.city = { contains: filters.city, mode: 'insensitive' };
  }
  if (filters.states?.length) {
    where.state = { in: filters.states };
  }
  if (filters.businessTypes?.length) {
    where.businessType = { in: filters.businessTypes };
  }
  if (filters.campaignId) {
    where.campaignId = filters.campaignId;
  }
  if (filters.ratingMin !== undefined) {
    where.rating = { ...((where.rating as object) || {}), gte: filters.ratingMin };
  }
  if (filters.ratingMax !== undefined) {
    where.rating = { ...((where.rating as object) || {}), lte: filters.ratingMax };
  }
  if (filters.qualificationMin !== undefined) {
    where.qualificationScore = {
      ...((where.qualificationScore as object) || {}),
      gte: filters.qualificationMin,
    };
  }
  if (filters.qualificationMax !== undefined) {
    where.qualificationScore = {
      ...((where.qualificationScore as object) || {}),
      lte: filters.qualificationMax,
    };
  }
  if (filters.hasWebsite !== undefined) {
    where.website = filters.hasWebsite ? { not: null } : null;
  }
  if (filters.hasPhone !== undefined) {
    where.phone = filters.hasPhone ? { not: null } : null;
  }

  return where;
}
