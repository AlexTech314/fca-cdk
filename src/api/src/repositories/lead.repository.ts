import { prisma } from '@fca/db';
import type { Prisma } from '@fca/db';
import type { LeadListField, LeadQuery, LeadDataType } from '../models/lead.model';

/** Maps the generic type param to the corresponding Prisma delegate name */
const leadDataModelMap: Record<LeadDataType, string> = {
  email: 'leadEmail',
  phone: 'leadPhone',
  social: 'leadSocialProfile',
};

// Map sort field names from camelCase frontend to Prisma field names
const sortFieldMap: Record<string, string> = {
  createdAt: 'createdAt',
  name: 'name',
  rating: 'rating',
  priorityScore: 'priorityScore',
  priorityTier: 'priorityTier',
  businessQualityScore: 'businessQualityScore',
  sellLikelihoodScore: 'sellLikelihoodScore',
  businessType: 'businessType',
  reviewCount: 'reviewCount',
  webScrapedAt: 'webScrapedAt',
  pipelineStatus: 'pipelineStatus',
};

const defaultLeadFields: LeadListField[] = [
  'name',
  'city',
  'state',
  'phone',
  'emails',
  'website',
  'rating',
  'businessType',
  'priorityScore',
];

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
    const { page, limit, sort, order, fields, ...filters } = query;
    const skip = (page - 1) * limit;
    const selectedFields = new Set<LeadListField>((fields?.length ? fields : defaultLeadFields) as LeadListField[]);

    const where = buildWhereClause(filters);
    const orderBy = buildOrderBy(sort, order);
    const select = buildLeadSelect(selectedFields);

    const [items, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select,
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
        leadEmails: { include: { sourcePage: { select: { id: true, url: true } } } },
        leadPhones: { include: { sourcePage: { select: { id: true, url: true } } } },
        leadSocialProfiles: { include: { sourcePage: { select: { id: true, url: true } } } },
        scrapeRuns: {
          orderBy: { startedAt: 'desc' },
          take: 5,
          include: {
            scrapedPages: {
              orderBy: { depth: 'asc' },
              include: { parentScrapedPage: { select: { id: true, url: true } } },
            },
          },
        },
      },
    });
  },

  async findByPlaceId(placeId: string) {
    return prisma.lead.findUnique({
      where: { placeId },
    });
  },

  async count(filters: Omit<LeadQuery, 'page' | 'limit' | 'sort' | 'order' | 'fields'>) {
    const where = buildWhereClause(filters);
    return prisma.lead.count({ where });
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
      prisma.lead.count({ where: { scoredAt: { not: null } } }),
    ]);
    return { totalLeads, qualifiedLeads };
  },

  async getScrapeRunsByLeadId(leadId: string) {
    return prisma.scrapeRun.findMany({
      where: { leadId },
      orderBy: { startedAt: 'desc' },
      include: {
        scrapedPages: {
          orderBy: { depth: 'asc' },
          include: { parentScrapedPage: { select: { id: true, url: true } } },
        },
      },
    });
  },

  async getScrapeRunTree(runId: string) {
    const run = await prisma.scrapeRun.findUnique({
      where: { id: runId },
      include: {
        scrapedPages: {
          orderBy: { depth: 'asc' },
          include: { parentScrapedPage: { select: { id: true, url: true } } },
        },
      },
    });
    return run;
  },

  async deleteScrapeRun(runId: string, leadId: string) {
    await prisma.$transaction(async (tx) => {
      await tx.scrapeRun.delete({ where: { id: runId } });

      const remaining = await tx.scrapeRun.findFirst({
        where: { leadId },
        orderBy: { startedAt: 'desc' },
      });

      if (!remaining) {
        await tx.lead.update({
          where: { id: leadId },
          data: {
            webScrapedAt: null,
            contactPageUrl: null,
            scrapeMarkdownS3Key: null,
          },
        });
      }
    });
  },

  async getScrapedPageMarkdownKey(pageId: string): Promise<string | null> {
    const page = await prisma.scrapedPage.findUnique({
      where: { id: pageId },
      select: { markdownS3Key: true },
    });
    return page?.markdownS3Key ?? null;
  },

  async deleteScrapedPage(pageId: string) {
    return (prisma as any).scrapedPage.delete({ where: { id: pageId } });
  },

  async deleteLeadData(type: LeadDataType, id: string) {
    const model = leadDataModelMap[type];
    return (prisma as any)[model].delete({ where: { id } });
  },

  async updateLeadData(type: LeadDataType, id: string, data: Record<string, unknown>) {
    const model = leadDataModelMap[type];
    return (prisma as any)[model].update({ where: { id }, data });
  },

  /** Field-level provenance: value-to-source mappings for audit */
  async getLeadProvenance(leadId: string) {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: {
        leadEmails: { include: { sourcePage: { select: { id: true, url: true } } } },
        leadPhones: { include: { sourcePage: { select: { id: true, url: true } } } },
        leadSocialProfiles: { include: { sourcePage: { select: { id: true, url: true } } } },
      },
    });
    if (!lead) return null;
    return {
      emails: lead.leadEmails.map((e) => ({
        value: e.value,
        sourcePageId: e.sourcePageId,
        sourceRunId: e.sourceRunId,
        sourcePage: e.sourcePage ? { id: e.sourcePage.id, url: e.sourcePage.url } : null,
      })),
      phones: lead.leadPhones.map((p) => ({
        value: p.value,
        sourcePageId: p.sourcePageId,
        sourceRunId: p.sourceRunId,
        sourcePage: p.sourcePage ? { id: p.sourcePage.id, url: p.sourcePage.url } : null,
      })),
      socialProfiles: lead.leadSocialProfiles.map((s) => ({
        platform: s.platform,
        url: s.url,
        sourcePageId: s.sourcePageId,
        sourceRunId: s.sourceRunId,
        sourcePage: s.sourcePage ? { id: s.sourcePage.id, url: s.sourcePage.url } : null,
      })),
    };
  },
};

function buildWhereClause(
  filters: Omit<LeadQuery, 'page' | 'limit' | 'sort' | 'order' | 'fields'>
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
    where.priorityScore = {
      ...((where.priorityScore as object) || {}),
      gte: filters.qualificationMin,
    };
  }
  if (filters.qualificationMax !== undefined) {
    where.priorityScore = {
      ...((where.priorityScore as object) || {}),
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
  if (filters.hasExtractedEmail === true) {
    where.leadEmails = { some: {} };
  } else if (filters.hasExtractedEmail === false) {
    where.leadEmails = { none: {} };
  }
  if (filters.hasExtractedPhone === true) {
    where.leadPhones = { some: {} };
  } else if (filters.hasExtractedPhone === false) {
    where.leadPhones = { none: {} };
  }

  return where;
}

function buildLeadSelect(fields: Set<LeadListField>) {
  const select: Record<string, unknown> = {
    id: true,
    placeId: true,
    pipelineStatus: true,
    createdAt: true,
    updatedAt: true,
  };

  if (fields.has('name')) {
    select.name = true;
    select.franchise = { select: { id: true, name: true, displayName: true } };
  }
  if (fields.has('city')) {
    select.locationCity = { select: { id: true, name: true } };
  }
  if (fields.has('state')) {
    select.locationState = { select: { id: true, name: true } };
  }
  if (fields.has('phone')) {
    select.phone = true;
  }
  if (fields.has('emails')) {
    select.leadEmails = { select: { value: true } };
  }
  if (fields.has('website')) {
    select.website = true;
  }
  if (fields.has('googleMaps')) {
    select.googleMapsUri = true;
  }
  if (fields.has('rating')) {
    select.rating = true;
  }
  if (fields.has('businessType')) {
    select.businessType = true;
  }
  if (fields.has('priorityScore')) {
    select.priorityScore = true;
    select.priorityTier = true;
  }
  if (fields.has('priorityTier')) {
    select.priorityTier = true;
  }
  if (fields.has('businessQualityScore')) {
    select.businessQualityScore = true;
  }
  if (fields.has('sellLikelihoodScore')) {
    select.sellLikelihoodScore = true;
  }
  if (fields.has('webScrapedAt')) {
    select.webScrapedAt = true;
  }
  if (fields.has('createdAt')) {
    select.createdAt = true;
  }

  return select;
}
