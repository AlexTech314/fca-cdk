import { prisma } from '@fca/db';
import type { CreateAssetInput, UpdateAssetInput, AssetQuery } from '../models/asset.model';

export const assetRepository = {
  async findMany(query: AssetQuery) {
    const { category, page, limit, search } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (category) {
      where.category = category;
    }
    if (search) {
      where.OR = [
        { fileName: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
        { s3Key: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.asset.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.asset.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  async findById(id: string) {
    return prisma.asset.findUnique({ where: { id } });
  },

  async findByS3Key(s3Key: string) {
    return prisma.asset.findUnique({ where: { s3Key } });
  },

  async create(data: CreateAssetInput) {
    return prisma.asset.create({ data });
  },

  async update(id: string, data: UpdateAssetInput) {
    return prisma.asset.update({ where: { id }, data });
  },

  async delete(id: string) {
    await prisma.asset.delete({ where: { id } });
  },
};
