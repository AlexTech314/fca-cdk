import { prisma } from '@fca/db';
import type { Prisma } from '@fca/db';
import type { TombstoneQuery, CreateTombstoneInput, UpdateTombstoneInput } from '../models/tombstone.model';

const tombstoneInclude = {
  industries: { include: { industry: true } },
  dealTypes: { include: { dealType: true } },
  asset: { select: { id: true, s3Key: true, fileName: true, fileType: true } },
  pressRelease: { select: { id: true, slug: true, title: true } },
  locationStates: { include: { state: true } },
  locationCities: { include: { city: { include: { state: true } } } },
} as const;

export const tombstoneRepository = {
  async findMany(query: TombstoneQuery) {
    const { page, limit, industry, state, city, year, search, published } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.TombstoneWhereInput = {};

    if (published !== undefined) {
      where.isPublished = published;
    }
    if (industry) {
      where.industries = { some: { industry: { slug: industry } } };
    }
    if (state) {
      where.locationStates = { some: { stateId: { equals: state, mode: 'insensitive' } } };
    }
    if (city) {
      where.locationCities = { some: { city: { name: { equals: city, mode: 'insensitive' } } } };
    }
    if (year) {
      where.transactionYear = year;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.tombstone.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ transactionYear: 'desc' }, { sortOrder: 'asc' }],
        include: tombstoneInclude,
      }),
      prisma.tombstone.count({ where }),
    ]);

    return {
      items: items.map(formatTombstone),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  async findBySlug(slug: string) {
    const tombstone = await prisma.tombstone.findUnique({
      where: { slug },
      include: tombstoneInclude,
    });
    return tombstone ? formatTombstone(tombstone) : null;
  },

  async findById(id: string) {
    const tombstone = await prisma.tombstone.findUnique({
      where: { id },
      include: tombstoneInclude,
    });
    return tombstone ? formatTombstone(tombstone) : null;
  },

  async create(data: CreateTombstoneInput) {
    const { industryIds, dealTypeIds, ...tombstoneData } = data;

    const tombstone = await prisma.tombstone.create({
      data: {
        ...tombstoneData,
        slug: data.slug || generateSlug(data.name),
        industries: industryIds
          ? { create: industryIds.map((industryId) => ({ industryId })) }
          : undefined,
        dealTypes: dealTypeIds
          ? { create: dealTypeIds.map((dealTypeId) => ({ dealTypeId })) }
          : undefined,
      },
      include: tombstoneInclude,
    });

    return formatTombstone(tombstone);
  },

  async update(id: string, data: UpdateTombstoneInput) {
    const { industryIds, dealTypeIds, ...tombstoneData } = data;

    if (industryIds !== undefined) {
      await prisma.tombstoneIndustry.deleteMany({ where: { tombstoneId: id } });
      if (industryIds.length > 0) {
        await prisma.tombstoneIndustry.createMany({
          data: industryIds.map((industryId) => ({ tombstoneId: id, industryId })),
        });
      }
    }

    if (dealTypeIds !== undefined) {
      await prisma.tombstoneDealType.deleteMany({ where: { tombstoneId: id } });
      if (dealTypeIds.length > 0) {
        await prisma.tombstoneDealType.createMany({
          data: dealTypeIds.map((dealTypeId) => ({ tombstoneId: id, dealTypeId })),
        });
      }
    }

    const tombstone = await prisma.tombstone.update({
      where: { id },
      data: tombstoneData,
      include: tombstoneInclude,
    });

    return formatTombstone(tombstone);
  },

  async delete(id: string) {
    await prisma.tombstone.delete({ where: { id } });
  },

  async updatePressRelease(id: string, pressReleaseId: string | null) {
    const tombstone = await prisma.tombstone.update({
      where: { id },
      data: { pressReleaseId },
      include: tombstoneInclude,
    });
    return formatTombstone(tombstone);
  },

  async getFilterOptions() {
    const [stateResults, cityResults, yearResults, industries] = await Promise.all([
      prisma.tombstoneState.findMany({
        where: { tombstone: { isPublished: true } },
        select: { state: { select: { id: true, name: true } } },
        distinct: ['stateId'],
      }),
      prisma.tombstoneCity.findMany({
        where: { tombstone: { isPublished: true } },
        select: { city: { select: { id: true, name: true, stateId: true } } },
        distinct: ['cityId'],
      }),
      prisma.tombstone.findMany({
        where: { isPublished: true, transactionYear: { not: null } },
        select: { transactionYear: true },
        distinct: ['transactionYear'],
        orderBy: { transactionYear: 'desc' },
      }),
      prisma.industry.findMany({
        select: { id: true, slug: true, name: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    return {
      states: stateResults
        .map((r) => r.state)
        .sort((a, b) => a.name.localeCompare(b.name)),
      cities: cityResults
        .map((r) => r.city)
        .sort((a, b) => a.name.localeCompare(b.name)),
      years: yearResults
        .map((r) => r.transactionYear!)
        .filter((y): y is number => y !== null),
      industries,
    };
  },

  async findRelated(slug: string, limit = 5) {
    const tombstone = await prisma.tombstone.findUnique({
      where: { slug },
      include: { industries: true },
    });

    if (!tombstone) return [];

    const industryIds = tombstone.industries.map((ti) => ti.industryId);

    const relatedPosts = await prisma.blogPost.findMany({
      where: {
        isPublished: true,
        industries: { some: { industryId: { in: industryIds } } },
        // Exclude the press release if any
        id: tombstone.pressReleaseId ? { not: tombstone.pressReleaseId } : undefined,
      },
      select: {
        slug: true,
        title: true,
        excerpt: true,
        publishedAt: true,
        category: true,
      },
      take: limit,
      orderBy: { publishedAt: 'desc' },
    });

    return relatedPosts;
  },
};

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function formatTombstone(tombstone: any) {
  return {
    ...tombstone,
    industries: tombstone.industries?.map((ti: any) => ti.industry) || [],
    dealTypes: tombstone.dealTypes?.map((td: any) => td.dealType) || [],
    locationStates: tombstone.locationStates?.map((s: any) => s.state) || [],
    locationCities: tombstone.locationCities?.map((c: any) => ({
      id: c.city.id,
      name: c.city.name,
      stateId: c.city.stateId,
      stateName: c.city.state?.name,
    })) || [],
  };
}
