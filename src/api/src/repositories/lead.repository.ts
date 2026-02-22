import { prisma } from '@fca/db';
import type { Prisma } from '@fca/db';
import type { LeadQuery } from '../models/lead.model';

// Map sort field names from camelCase frontend to Prisma field names
const sortFieldMap: Record<string, string> = {
  createdAt: 'createdAt',
  name: 'name',
  rating: 'rating',
  qualificationScore: 'qualificationScore',
  businessType: 'businessType',
  reviewCount: 'reviewCount',
};

function buildOrderBy(sort: string, order: 'asc' | 'desc'): Prisma.LeadOrderByWithRelationInput {
  if (sort === 'city') {
    return { locationCity: { name: order } };
  }
  if (sort === 'state') {
    return { locationState: { name: order } };
  }
  const field = sortFieldMap[sort] || 'createdAt';
  return { [field]: order };
}

export const leadRepository = {
  async findMany(query: LeadQuery) {
    const { page, limit, sort, order, ...filters } = query;
    const skip = (page - 1) * limit;

    const where = buildWhereClause(filters);
    const orderBy = buildOrderBy(sort, order);

    const [items, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          campaign: { select: { id: true, name: true } },
          franchise: { select: { id: true, name: true, displayName: true } },
          locationCity: { select: { id: true, name: true } },
          locationState: { select: { id: true, name: true } },
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
        franchise: true,
        searchQuery: { select: { id: true, textQuery: true } },
        locationCity: { select: { id: true, name: true } },
        locationState: { select: { id: true, name: true } },
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
      by: ['locationStateId'],
      _count: { id: true },
      where: { locationStateId: { not: null } },
      orderBy: { _count: { id: 'desc' } },
    });
    const stateIds = results.map((r) => r.locationStateId!);
    const states = await prisma.state.findMany({
      where: { id: { in: stateIds } },
      select: { id: true, name: true },
    });
    const stateMap = new Map(states.map((s) => [s.id, s.name]));
    return results.map((r) => ({
      name: stateMap.get(r.locationStateId!) ?? r.locationStateId!,
      value: r._count.id,
    }));
  },

  async getLeadsOverTime(startDate: Date, endDate: Date, granularity: 'hour' | 'day' = 'day') {
    const trunc = granularity === 'hour' ? 'hour' : 'day';
    const results = await prisma.$queryRaw<Array<{ bucket: Date; count: bigint }>>`
      SELECT DATE_TRUNC(${trunc}, created_at) as bucket, COUNT(*) as count
      FROM leads
      WHERE created_at >= ${startDate} AND created_at <= ${endDate}
      GROUP BY bucket
      ORDER BY bucket ASC
    `;
    return results.map((r) => ({
      timestamp: r.bucket instanceof Date ? r.bucket.toISOString() : String(r.bucket),
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
  if (filters.cityId) {
    where.locationCityId = filters.cityId;
  }
  if (filters.stateIds?.length) {
    where.locationStateId = { in: filters.stateIds };
  } else if (filters.stateId) {
    where.locationStateId = filters.stateId;
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
  if (filters.franchiseId) {
    where.franchiseId = filters.franchiseId;
  }

  return where;
}
