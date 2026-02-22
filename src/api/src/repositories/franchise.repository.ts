import { prisma } from '@fca/db';

export const franchiseRepository = {
  async findMany() {
    return prisma.franchise.findMany({
      orderBy: { displayName: 'asc' },
      include: {
        _count: { select: { leads: true } },
      },
    });
  },

  async findById(id: string) {
    return prisma.franchise.findUnique({
      where: { id },
      include: {
        leads: {
          orderBy: { name: 'asc' },
          include: {
            campaign: { select: { id: true, name: true } },
          },
        },
      },
    });
  },

  async findByName(name: string) {
    const normalized = name.trim().toLowerCase().replace(/\s+/g, ' ');
    return prisma.franchise.findUnique({
      where: { name: normalized },
    });
  },

  async create(data: { name: string; displayName?: string }) {
    const name = data.name.trim().toLowerCase().replace(/\s+/g, ' ');
    return prisma.franchise.create({
      data: {
        name,
        displayName: data.displayName ?? data.name,
      },
    });
  },

  async linkLeads(franchiseId: string, leadIds: string[]) {
    await prisma.lead.updateMany({
      where: { id: { in: leadIds } },
      data: { franchiseId },
    });
    return prisma.franchise.findUnique({
      where: { id: franchiseId },
      include: { _count: { select: { leads: true } } },
    });
  },

  async unlinkLead(leadId: string) {
    return prisma.lead.update({
      where: { id: leadId },
      data: { franchiseId: null },
    });
  },
};
