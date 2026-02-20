import { prisma } from '@fca/db';
import type { FargateTaskType, FargateTaskStatus } from '@fca/db';

export interface TaskListQuery {
  page?: number;
  limit?: number;
  type?: FargateTaskType;
  status?: FargateTaskStatus;
}

export const taskRepository = {
  async findMany(query: TaskListQuery) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 50, 100);
    const skip = (page - 1) * limit;

    const where: { type?: FargateTaskType; status?: FargateTaskStatus } = {};
    if (query.type) where.type = query.type;
    if (query.status) where.status = query.status;

    const [items, total] = await Promise.all([
      prisma.fargateTask.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.fargateTask.count({ where }),
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
    return prisma.fargateTask.findUnique({
      where: { id },
    });
  },

  async updateStatus(id: string, status: FargateTaskStatus, errorMessage?: string | null) {
    return prisma.fargateTask.update({
      where: { id },
      data: {
        status,
        completedAt: status === 'completed' || status === 'failed' || status === 'cancelled' ? new Date() : undefined,
        errorMessage: errorMessage ?? undefined,
      },
    });
  },
};
