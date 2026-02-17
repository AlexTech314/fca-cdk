import { prisma } from '@fca/db';
import type { CreateCampaignInput, UpdateCampaignInput } from '../models/campaign.model';

export const campaignRepository = {
  async findMany() {
    const campaigns = await prisma.campaign.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { leads: true, runs: true } },
        runs: {
          orderBy: { startedAt: 'desc' },
          take: 1,
          select: { startedAt: true },
        },
      },
    });

    return campaigns.map((c) => ({
      ...c,
      totalLeads: c._count.leads,
      runsCount: c._count.runs,
      lastRunAt: c.runs[0]?.startedAt?.toISOString() || null,
      _count: undefined,
      runs: undefined,
    }));
  },

  async findById(id: string) {
    return prisma.campaign.findUnique({
      where: { id },
    });
  },

  async create(data: CreateCampaignInput & { queriesS3Key: string; createdById?: string }) {
    return prisma.campaign.create({
      data: {
        name: data.name,
        description: data.description,
        queriesS3Key: data.queriesS3Key,
        createdById: data.createdById,
      },
    });
  },

  async update(
    id: string,
    data: Partial<UpdateCampaignInput> & {
      queriesS3Key?: string;
      queriesCount?: number;
      maxResultsPerSearch?: number;
      skipCachedSearches?: boolean;
    }
  ) {
    const { updateSearches, ...updateData } = data;
    return prisma.campaign.update({
      where: { id },
      data: updateData,
    });
  },

  async delete(id: string) {
    await prisma.campaign.delete({ where: { id } });
  },

  async confirmUpload(id: string, searchesCount: number) {
    return prisma.campaign.update({
      where: { id },
      data: { queriesCount: searchesCount },
    });
  },
};

export const campaignRunRepository = {
  async findByCampaignId(campaignId: string) {
    return prisma.campaignRun.findMany({
      where: { campaignId },
      orderBy: { startedAt: 'desc' },
    });
  },

  async findById(id: string) {
    return prisma.campaignRun.findUnique({
      where: { id },
      include: {
        campaign: { select: { id: true, name: true } },
      },
    });
  },

  async create(data: { campaignId: string; startedById?: string; queriesTotal: number }) {
    return prisma.campaignRun.create({
      data: {
        campaignId: data.campaignId,
        startedById: data.startedById,
        status: 'running',
        queriesTotal: data.queriesTotal,
      },
    });
  },

  async updateMetrics(
    id: string,
    data: {
      queriesExecuted?: number;
      leadsFound?: number;
      duplicatesSkipped?: number;
      errors?: number;
      errorMessages?: string[];
      status?: string;
      completedAt?: Date;
    }
  ) {
    return prisma.campaignRun.update({
      where: { id },
      data,
    });
  },

  async getCampaignsOverTime(startDate: Date, endDate: Date) {
    const results = await prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
      SELECT DATE(started_at) as date, COUNT(*) as count
      FROM campaign_runs
      WHERE started_at >= ${startDate} AND started_at <= ${endDate}
      GROUP BY DATE(started_at)
      ORDER BY date ASC
    `;
    return results.map((r) => ({
      timestamp: r.date,
      value: Number(r.count),
    }));
  },
};
