import { prisma } from '../lib/prisma';
import type { Prisma } from '@prisma/client';
import type { SellerIntakeInput, UpdateSellerIntakeInput, SellerIntakeQuery } from '../models/seller-intake.model';

export const sellerIntakeRepository = {
  async findMany(query: SellerIntakeQuery) {
    const { page, limit, status, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.SellerIntakeWhereInput = {};

    if (status) {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { companyName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.sellerIntake.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.sellerIntake.count({ where }),
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
    return prisma.sellerIntake.findUnique({
      where: { id },
    });
  },

  async create(data: SellerIntakeInput) {
    return prisma.sellerIntake.create({
      data,
    });
  },

  async update(id: string, data: UpdateSellerIntakeInput) {
    return prisma.sellerIntake.update({
      where: { id },
      data,
    });
  },

  async getStatusCounts() {
    const counts = await prisma.sellerIntake.groupBy({
      by: ['status'],
      _count: true,
    });

    return counts.reduce(
      (acc, { status, _count }) => {
        acc[status] = _count;
        return acc;
      },
      {} as Record<string, number>
    );
  },
};
