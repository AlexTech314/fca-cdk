import { prisma } from '../lib/prisma';
import type { Prisma } from '@prisma/client';
import type { SubscribeInput, SubscriberQuery } from '../models/subscriber.model';

export const subscriberRepository = {
  async findMany(query: SubscriberQuery) {
    const { page, limit, subscribed, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.EmailSubscriberWhereInput = {};

    if (subscribed !== undefined) {
      where.isSubscribed = subscribed;
    }
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.emailSubscriber.findMany({
        where,
        skip,
        take: limit,
        orderBy: { subscribedAt: 'desc' },
      }),
      prisma.emailSubscriber.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  async findByEmail(email: string) {
    return prisma.emailSubscriber.findUnique({
      where: { email },
    });
  },

  async subscribe(data: SubscribeInput) {
    // Upsert - if already exists, just update to re-subscribe
    return prisma.emailSubscriber.upsert({
      where: { email: data.email },
      update: {
        name: data.name,
        source: data.source,
        isSubscribed: true,
        unsubscribedAt: null,
      },
      create: {
        email: data.email,
        name: data.name,
        source: data.source,
      },
    });
  },

  async unsubscribe(email: string) {
    return prisma.emailSubscriber.update({
      where: { email },
      data: {
        isSubscribed: false,
        unsubscribedAt: new Date(),
      },
    });
  },

  async delete(id: string) {
    await prisma.emailSubscriber.delete({ where: { id } });
  },

  async getActiveCount() {
    return prisma.emailSubscriber.count({
      where: { isSubscribed: true },
    });
  },
};
