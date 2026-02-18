import { prisma } from '@fca/db';
import type { CreateContentTagInput, UpdateContentTagInput } from '../models/content-tag.model';

export const contentTagRepository = {
  async findAll() {
    return prisma.contentTag.findMany({
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  },

  async findBySlug(slug: string) {
    return prisma.contentTag.findUnique({
      where: { slug },
    });
  },

  async findById(id: string) {
    return prisma.contentTag.findUnique({
      where: { id },
    });
  },

  async findBySlugWithContent(slug: string) {
    const tag = await prisma.contentTag.findUnique({
      where: { slug },
      include: {
        tombstones: {
          where: { tombstone: { isPublished: true } },
          include: {
            tombstone: {
              select: {
                id: true,
                slug: true,
                name: true,
                asset: { select: { id: true, s3Key: true, fileName: true, fileType: true } },
              },
            },
          },
          take: 10,
        },
        blogPosts: {
          where: { blogPost: { isPublished: true } },
          include: {
            blogPost: {
              select: {
                slug: true,
                title: true,
                excerpt: true,
                publishedAt: true,
                category: true,
              },
            },
          },
          take: 10,
        },
      },
    });

    if (!tag) return null;

    return {
      ...tag,
      tombstones: tag.tombstones.map((t) => t.tombstone),
      blogPosts: tag.blogPosts.map((b) => b.blogPost),
    };
  },

  async findByCategory(category: string) {
    return prisma.contentTag.findMany({
      where: { category },
      orderBy: { name: 'asc' },
    });
  },

  async create(data: CreateContentTagInput) {
    return prisma.contentTag.create({
      data: {
        ...data,
        slug: data.slug || generateSlug(data.name),
      },
    });
  },

  async update(id: string, data: UpdateContentTagInput) {
    return prisma.contentTag.update({
      where: { id },
      data,
    });
  },

  async delete(id: string) {
    await prisma.contentTag.delete({ where: { id } });
  },
};

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
