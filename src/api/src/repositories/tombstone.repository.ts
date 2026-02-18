import { prisma } from '@fca/db';
import type { Prisma } from '@fca/db';
import type { TombstoneQuery, CreateTombstoneInput, UpdateTombstoneInput } from '../models/tombstone.model';

export const tombstoneRepository = {
  async findMany(query: TombstoneQuery) {
    const { page, limit, industry, state, city, year, tag, search, published } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.TombstoneWhereInput = {};

    if (published !== undefined) {
      where.isPublished = published;
    }
    if (industry) {
      where.industry = { contains: industry, mode: 'insensitive' };
    }
    if (state) {
      where.state = { equals: state, mode: 'insensitive' };
    }
    if (city) {
      where.city = { equals: city, mode: 'insensitive' };
    }
    if (year) {
      where.transactionYear = year;
    }
    if (tag) {
      where.tags = { some: { tag: { slug: tag } } };
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { industry: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.tombstone.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ transactionYear: 'desc' }, { sortOrder: 'asc' }],
        include: {
          tags: { include: { tag: true } },
          asset: { select: { id: true, s3Key: true, fileName: true, fileType: true } },
          pressRelease: { select: { id: true, slug: true, title: true } },
        },
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
      include: {
        tags: { include: { tag: true } },
        asset: { select: { id: true, s3Key: true, fileName: true, fileType: true } },
        pressRelease: { select: { id: true, slug: true, title: true } },
      },
    });
    return tombstone ? formatTombstone(tombstone) : null;
  },

  async findById(id: string) {
    const tombstone = await prisma.tombstone.findUnique({
      where: { id },
      include: {
        tags: { include: { tag: true } },
        asset: { select: { id: true, s3Key: true, fileName: true, fileType: true } },
        pressRelease: { select: { id: true, slug: true, title: true } },
      },
    });
    return tombstone ? formatTombstone(tombstone) : null;
  },

  async create(data: CreateTombstoneInput) {
    const { tagIds, ...tombstoneData } = data;

    const tombstone = await prisma.tombstone.create({
      data: {
        ...tombstoneData,
        slug: data.slug || generateSlug(data.name),
        tags: tagIds
          ? { create: tagIds.map((tagId) => ({ tagId })) }
          : undefined,
      },
      include: {
        tags: { include: { tag: true } },
        asset: { select: { id: true, s3Key: true, fileName: true, fileType: true } },
        pressRelease: { select: { id: true, slug: true, title: true } },
      },
    });

    return formatTombstone(tombstone);
  },

  async update(id: string, data: UpdateTombstoneInput) {
    const { tagIds, ...tombstoneData } = data;

    // If tagIds provided, update tag relations
    if (tagIds !== undefined) {
      await prisma.tombstoneTag.deleteMany({ where: { tombstoneId: id } });
      if (tagIds.length > 0) {
        await prisma.tombstoneTag.createMany({
          data: tagIds.map((tagId) => ({ tombstoneId: id, tagId })),
        });
      }
    }

    const tombstone = await prisma.tombstone.update({
      where: { id },
      data: tombstoneData,
      include: {
        tags: { include: { tag: true } },
        asset: { select: { id: true, s3Key: true, fileName: true, fileType: true } },
        pressRelease: { select: { id: true, slug: true, title: true } },
      },
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
      include: {
        tags: { include: { tag: true } },
        asset: { select: { id: true, s3Key: true, fileName: true, fileType: true } },
        pressRelease: { select: { id: true, slug: true, title: true } },
      },
    });
    return formatTombstone(tombstone);
  },

  async getFilterOptions() {
    const result = await prisma.$queryRaw<
      {
        states: string[];
        cities: string[];
        years: number[];
        tags: unknown;
      }[]
    >`
      SELECT
        (
          SELECT COALESCE(ARRAY_AGG(DISTINCT state ORDER BY state), '{}')
          FROM tombstones
          WHERE is_published = true AND state IS NOT NULL
        ) AS states,
        (
          SELECT COALESCE(ARRAY_AGG(DISTINCT city ORDER BY city), '{}')
          FROM tombstones
          WHERE is_published = true AND city IS NOT NULL
        ) AS cities,
        (
          SELECT COALESCE(ARRAY_AGG(DISTINCT transaction_year ORDER BY transaction_year DESC), '{}')
          FROM tombstones
          WHERE is_published = true AND transaction_year IS NOT NULL
        ) AS years,
        (
          SELECT COALESCE(JSON_AGG(JSON_BUILD_OBJECT('slug', slug, 'name', name) ORDER BY name), '[]'::json)
          FROM content_tags
          WHERE category = 'industry'
        ) AS tags
    `;
    const row = result[0];
    if (!row) {
      return { states: [], cities: [], years: [], tags: [] };
    }
    const tags = Array.isArray(row.tags)
      ? (row.tags as { slug: string; name: string }[])
      : typeof row.tags === 'string'
        ? (JSON.parse(row.tags) as { slug: string; name: string }[])
        : (row.tags as { slug: string; name: string }[]) ?? [];
    return {
      states: row.states ?? [],
      cities: row.cities ?? [],
      years: row.years ?? [],
      tags,
    };
  },

  async findRelated(slug: string, limit = 5) {
    // Find related news by matching tags
    const tombstone = await prisma.tombstone.findUnique({
      where: { slug },
      include: { tags: true },
    });

    if (!tombstone) return [];

    const tagIds = tombstone.tags.map((t) => t.tagId);

    const relatedPosts = await prisma.blogPost.findMany({
      where: {
        isPublished: true,
        tags: { some: { tagId: { in: tagIds } } },
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
    tags: tombstone.tags?.map((t: any) => t.tag) || [],
  };
}
