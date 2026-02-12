import { prisma } from '../lib/prisma';
import type { PageContentInput, UpdatePageContentInput } from '../models/page-content.model';

export const pageContentRepository = {
  async findAll() {
    return prisma.pageContent.findMany({
      orderBy: { pageKey: 'asc' },
    });
  },

  async findByKey(pageKey: string) {
    return prisma.pageContent.findUnique({
      where: { pageKey },
    });
  },

  async upsert(data: PageContentInput) {
    return prisma.pageContent.upsert({
      where: { pageKey: data.pageKey },
      update: {
        title: data.title,
        content: data.content,
        metadata: data.metadata,
      },
      create: data,
    });
  },

  async update(pageKey: string, data: UpdatePageContentInput) {
    return prisma.pageContent.update({
      where: { pageKey },
      data,
    });
  },
};
