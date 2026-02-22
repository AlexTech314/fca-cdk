import { prisma } from '@fca/db';
import type { Prisma } from '@fca/db';
import type { BlogPostQuery, CreateBlogPostInput, UpdateBlogPostInput } from '../models/blog-post.model';

export const blogPostRepository = {
  async findMany(query: BlogPostQuery) {
    const { page, limit, category, industry, industries, search, published, author } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.BlogPostWhereInput = {};

    if (published !== undefined) {
      where.isPublished = published;
    }
    if (category) {
      where.category = category;
    }
    if (author) {
      where.author = { contains: author, mode: 'insensitive' };
    }
    if (industries) {
      const slugs = industries.split(',').map((s) => s.trim()).filter(Boolean);
      if (slugs.length > 0) {
        where.industries = { some: { industry: { slug: { in: slugs } } } };
      }
    } else if (industry) {
      where.industries = { some: { industry: { slug: industry } } };
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
        { author: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          slug: true,
          title: true,
          excerpt: true,
          author: true,
          category: true,
          publishedAt: true,
          isPublished: true,
          createdAt: true,
          updatedAt: true,
          industries: { include: { industry: true } },
          tombstone: { select: { id: true, slug: true, name: true } },
        },
      }),
      prisma.blogPost.count({ where }),
    ]);

    return {
      items: items.map(formatBlogPost),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  async findBySlug(slug: string) {
    const post = await prisma.blogPost.findUnique({
      where: { slug },
      include: {
        industries: { include: { industry: true } },
        tombstone: { select: { id: true, slug: true, name: true } },
      },
    });
    return post ? formatBlogPost(post) : null;
  },

  async findById(id: string) {
    const post = await prisma.blogPost.findUnique({
      where: { id },
      include: {
        industries: { include: { industry: true } },
        tombstone: { select: { id: true, slug: true, name: true } },
      },
    });
    return post ? formatBlogPost(post) : null;
  },

  async create(data: CreateBlogPostInput) {
    const { industryIds, ...postData } = data;

    const post = await prisma.blogPost.create({
      data: {
        ...postData,
        slug: data.slug || generateSlug(data.title),
        industries: industryIds
          ? { create: industryIds.map((industryId) => ({ industryId })) }
          : undefined,
      },
      include: {
        industries: { include: { industry: true } },
        tombstone: { select: { id: true, slug: true, name: true } },
      },
    });

    return formatBlogPost(post);
  },

  async update(id: string, data: UpdateBlogPostInput) {
    const { industryIds, ...postData } = data;

    if (industryIds !== undefined) {
      await prisma.blogPostIndustry.deleteMany({ where: { blogPostId: id } });
      if (industryIds.length > 0) {
        await prisma.blogPostIndustry.createMany({
          data: industryIds.map((industryId) => ({ blogPostId: id, industryId })),
        });
      }
    }

    const post = await prisma.blogPost.update({
      where: { id },
      data: postData,
      include: {
        industries: { include: { industry: true } },
        tombstone: { select: { id: true, slug: true, name: true } },
      },
    });

    return formatBlogPost(post);
  },

  async delete(id: string) {
    await prisma.blogPost.delete({ where: { id } });
  },

  async publish(id: string, publish: boolean) {
    const post = await prisma.blogPost.update({
      where: { id },
      data: {
        isPublished: publish,
        publishedAt: publish ? new Date() : null,
      },
      include: {
        industries: { include: { industry: true } },
        tombstone: { select: { id: true, slug: true, name: true } },
      },
    });
    return formatBlogPost(post);
  },

  async findAdjacent(slug: string) {
    const rows = await prisma.$queryRaw<
      {
        prev_slug: string | null;
        prev_title: string | null;
        prev_date: Date | null;
        next_slug: string | null;
        next_title: string | null;
        next_date: Date | null;
      }[]
    >`
      WITH ordered AS (
        SELECT
          slug,
          title,
          published_at,
          category,
          ROW_NUMBER() OVER w AS rn,
          LAG(slug) OVER w AS prev_slug,
          LAG(title) OVER w AS prev_title,
          LAG(published_at) OVER w AS prev_date,
          LEAD(slug) OVER w AS next_slug,
          LEAD(title) OVER w AS next_title,
          LEAD(published_at) OVER w AS next_date
        FROM blog_posts
        WHERE is_published = true
          AND category = (SELECT category FROM blog_posts WHERE slug = ${slug} LIMIT 1)
        WINDOW w AS (ORDER BY published_at DESC NULLS LAST, created_at DESC)
      ),
      first_row AS (SELECT slug, title, published_at FROM ordered ORDER BY rn ASC LIMIT 1),
      last_row AS (SELECT slug, title, published_at FROM ordered ORDER BY rn DESC LIMIT 1)
      SELECT
        COALESCE(o.prev_slug, l.slug) AS prev_slug,
        COALESCE(o.prev_title, l.title) AS prev_title,
        COALESCE(o.prev_date, l.published_at) AS prev_date,
        COALESCE(o.next_slug, f.slug) AS next_slug,
        COALESCE(o.next_title, f.title) AS next_title,
        COALESCE(o.next_date, f.published_at) AS next_date
      FROM ordered o
      CROSS JOIN first_row f
      CROSS JOIN last_row l
      WHERE o.slug = ${slug}
    `;

    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      prev: r.prev_slug
        ? { slug: r.prev_slug, title: r.prev_title!, publishedAt: r.prev_date }
        : null,
      next: r.next_slug
        ? { slug: r.next_slug, title: r.next_title!, publishedAt: r.next_date }
        : null,
    };
  },

  async findRelated(slug: string, limit = 5) {
    const post = await prisma.blogPost.findUnique({
      where: { slug },
      include: { industries: true },
    });

    if (!post) return { tombstones: [], articles: [] };

    const industryIds = post.industries.map((i) => i.industryId);

    const [tombstones, articles] = await Promise.all([
      prisma.tombstone.findMany({
        where: {
          isPublished: true,
          industries: { some: { industryId: { in: industryIds } } },
        },
        take: limit,
        orderBy: { transactionYear: 'desc' },
        include: {
          industries: { include: { industry: true } },
          asset: { select: { id: true, s3Key: true, fileName: true, fileType: true } },
          pressRelease: { select: { id: true, slug: true, title: true } },
        },
      }),
      prisma.blogPost.findMany({
        where: {
          isPublished: true,
          id: { not: post.id },
          industries: { some: { industryId: { in: industryIds } } },
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
      }),
    ]);

    return {
      tombstones: tombstones.map((t) => ({
        ...t,
        industries: t.industries?.map((ti) => ti.industry) ?? [],
      })),
      articles,
    };
  },
};

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function formatBlogPost(post: any) {
  return {
    ...post,
    industries: post.industries?.map((i: any) => i.industry) || [],
  };
}
