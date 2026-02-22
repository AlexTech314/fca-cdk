import { prisma } from '@fca/db';

export const locationRepository = {
  async searchCities(q: string, limit = 10) {
    return prisma.city.findMany({
      where: {
        name: { startsWith: q, mode: 'insensitive' },
      },
      include: { state: { select: { id: true, name: true } } },
      orderBy: { population: { sort: 'desc', nulls: 'last' } },
      take: limit,
    });
  },

  async searchStates(q: string, limit = 10) {
    return prisma.state.findMany({
      where: {
        OR: [
          { name: { startsWith: q, mode: 'insensitive' } },
          { id: { startsWith: q.toUpperCase() } },
        ],
      },
      orderBy: { name: 'asc' },
      take: limit,
    });
  },

  async getAllStates() {
    return prisma.state.findMany({ orderBy: { name: 'asc' } });
  },

  async getCitiesByState(stateId: string, limit = 100) {
    return prisma.city.findMany({
      where: { stateId },
      orderBy: { population: { sort: 'desc', nulls: 'last' } },
      take: limit,
    });
  },

  async getTombstoneStates() {
    const results = await prisma.tombstoneState.findMany({
      select: {
        state: { select: { id: true, name: true } },
      },
      distinct: ['stateId'],
    });
    return results
      .map((r) => r.state)
      .sort((a, b) => a.name.localeCompare(b.name));
  },

  async getTombstoneCities() {
    const results = await prisma.tombstoneCity.findMany({
      select: {
        city: {
          select: { id: true, name: true, stateId: true, state: { select: { name: true } } },
        },
      },
      distinct: ['cityId'],
    });
    return results
      .map((r) => r.city)
      .sort((a, b) => a.name.localeCompare(b.name));
  },
};
