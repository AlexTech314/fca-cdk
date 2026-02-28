import { prisma, UserRole } from '@fca/db';
import { UpdateUserInput } from '../models/user.model';

export interface PaginationOptions {
  page: number;
  limit: number;
  search?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class UserRepository {
  async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  async findMany(options: PaginationOptions): Promise<PaginatedResult<Awaited<ReturnType<typeof prisma.user.findFirst>>>> {
    const { page, limit, search } = options;
    const skip = (page - 1) * limit;

    const where = search
      ? {
          email: { contains: search, mode: 'insensitive' as const },
        }
      : {};

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async create(data: { email: string; cognitoSub?: string; role?: UserRole }) {
    return prisma.user.create({
      data,
    });
  }

  async update(id: string, data: UpdateUserInput) {
    return prisma.user.update({
      where: { id },
      data,
    });
  }

  async updateRole(id: string, role: UserRole) {
    return prisma.user.update({
      where: { id },
      data: { role },
    });
  }

  async delete(id: string) {
    return prisma.user.delete({
      where: { id },
    });
  }

  async exists(id: string): Promise<boolean> {
    const count = await prisma.user.count({
      where: { id },
    });
    return count > 0;
  }

  async emailExists(email: string, excludeId?: string): Promise<boolean> {
    const count = await prisma.user.count({
      where: {
        email,
        ...(excludeId && { id: { not: excludeId } }),
      },
    });
    return count > 0;
  }
}

export const userRepository = new UserRepository();
