import { prisma } from '../lib/prisma';
import type { Prisma } from '@prisma/client';
import type { BlogPostQuery, CreateBlogPostInput, UpdateBlogPostInput } from '../models/blog-post.model';

export const blogPostRepository = {
  async findMany(query: BlogPostQuery) {
    const { page, limit, category, tag, search, published, author } = query;
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
    if (tag) {
      where.tags = { some: { tag: { slug: tag } } };
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
        include: {
          tags: { include: { tag: true } },
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
        tags: { include: { tag: true } },
        tombstone: { select: { id: true, slug: true, name: true } },
      },
    });
    return post ? formatBlogPost(post) : null;
  },

  async findById(id: string) {
    const post = await prisma.blogPost.findUnique({
      where: { id },
      include: {
        tags: { include: { tag: true } },
        tombstone: { select: { id: true, slug: true, name: true } },
      },
    });
    return post ? formatBlogPost(post) : null;
  },

  async findByPreviewToken(slug: string, token: string) {
    const post = await prisma.blogPost.findFirst({
      where: { slug, previewToken: token },
      include: {
        tags: { include: { tag: true } },
        tombstone: { select: { id: true, slug: true, name: true } },
      },
    });
    return post ? formatBlogPost(post) : null;
  },

  async create(data: CreateBlogPostInput) {
    const { tagIds, ...postData } = data;

    const post = await prisma.blogPost.create({
      data: {
        ...postData,
        slug: data.slug || generateSlug(data.title),
        tags: tagIds
          ? { create: tagIds.map((tagId) => ({ tagId })) }
          : undefined,
      },
      include: {
        tags: { include: { tag: true } },
        tombstone: { select: { id: true, slug: true, name: true } },
      },
    });

    return formatBlogPost(post);
  },

  async update(id: string, data: UpdateBlogPostInput) {
    const { tagIds, ...postData } = data;

    if (tagIds !== undefined) {
      await prisma.blogPostTag.deleteMany({ where: { blogPostId: id } });
      if (tagIds.length > 0) {
        await prisma.blogPostTag.createMany({
          data: tagIds.map((tagId) => ({ blogPostId: id, tagId })),
        });
      }
    }

    const post = await prisma.blogPost.update({
      where: { id },
      data: postData,
      include: {
        tags: { include: { tag: true } },
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
        tags: { include: { tag: true } },
        tombstone: { select: { id: true, slug: true, name: true } },
      },
    });
    return formatBlogPost(post);
  },

  async findRelated(slug: string, limit = 5) {
    const post = await prisma.blogPost.findUnique({
      where: { slug },
      include: { tags: true },
    });

    if (!post) return { tombstones: [], articles: [] };

    const tagIds = post.tags.map((t) => t.tagId);

    const [tombstones, articles] = await Promise.all([
      prisma.tombstone.findMany({
        where: {
          isPublished: true,
          tags: { some: { tagId: { in: tagIds } } },
        },
        take: limit,
        orderBy: { transactionYear: 'desc' },
      }),
      prisma.blogPost.findMany({
        where: {
          isPublished: true,
          id: { not: post.id },
          tags: { some: { tagId: { in: tagIds } } },
        },
        take: limit,
        orderBy: { publishedAt: 'desc' },
      }),
    ]);

    return { tombstones, articles };
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
    tags: post.tags?.map((t: any) => t.tag) || [],
  };
}
