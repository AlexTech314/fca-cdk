import { prisma } from '../lib/prisma';
import type {
  CreateTeamMemberInput,
  UpdateTeamMemberInput,
  TeamMemberQuery,
  CreateCommunityServiceInput,
  UpdateCommunityServiceInput,
  CreateFAQInput,
  UpdateFAQInput,
  CreateCoreValueInput,
  UpdateCoreValueInput,
  CreateIndustrySectorInput,
  UpdateIndustrySectorInput,
  CreateServiceOfferingInput,
  UpdateServiceOfferingInput,
  ServiceOfferingQuery,
  CreateAwardInput,
  UpdateAwardInput,
  UpdateSiteConfigInput,
  ReorderInput,
} from '../models/static-content.model';

// ============================================
// SITE CONFIG
// ============================================

export const siteConfigRepository = {
  async get() {
    return prisma.siteConfig.findUnique({ where: { id: 'default' } });
  },

  async upsert(data: UpdateSiteConfigInput) {
    return prisma.siteConfig.upsert({
      where: { id: 'default' },
      update: data,
      create: {
        id: 'default',
        name: data.name || '',
        url: data.url || '',
        ...data,
      },
    });
  },
};

// ============================================
// TEAM MEMBER
// ============================================

export const teamMemberRepository = {
  async findMany(query: TeamMemberQuery = {}) {
    const { category, published } = query;
    return prisma.teamMember.findMany({
      where: {
        category: category || undefined,
        isPublished: published,
      },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    });
  },

  async findById(id: string) {
    return prisma.teamMember.findUnique({ where: { id } });
  },

  async create(data: CreateTeamMemberInput) {
    return prisma.teamMember.create({ data });
  },

  async update(id: string, data: UpdateTeamMemberInput) {
    return prisma.teamMember.update({ where: { id }, data });
  },

  async delete(id: string) {
    await prisma.teamMember.delete({ where: { id } });
  },

  async reorder(items: ReorderInput['items']) {
    await Promise.all(
      items.map((item) =>
        prisma.teamMember.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        })
      )
    );
  },
};

// ============================================
// COMMUNITY SERVICE
// ============================================

export const communityServiceRepository = {
  async findMany(published?: boolean) {
    return prisma.communityService.findMany({
      where: published !== undefined ? { isPublished: published } : undefined,
      orderBy: { sortOrder: 'asc' },
    });
  },

  async findById(id: string) {
    return prisma.communityService.findUnique({ where: { id } });
  },

  async create(data: CreateCommunityServiceInput) {
    return prisma.communityService.create({ data });
  },

  async update(id: string, data: UpdateCommunityServiceInput) {
    return prisma.communityService.update({ where: { id }, data });
  },

  async delete(id: string) {
    await prisma.communityService.delete({ where: { id } });
  },
};

// ============================================
// FAQ
// ============================================

export const faqRepository = {
  async findMany(published?: boolean) {
    return prisma.fAQ.findMany({
      where: published !== undefined ? { isPublished: published } : undefined,
      orderBy: { sortOrder: 'asc' },
    });
  },

  async findById(id: string) {
    return prisma.fAQ.findUnique({ where: { id } });
  },

  async create(data: CreateFAQInput) {
    return prisma.fAQ.create({ data });
  },

  async update(id: string, data: UpdateFAQInput) {
    return prisma.fAQ.update({ where: { id }, data });
  },

  async delete(id: string) {
    await prisma.fAQ.delete({ where: { id } });
  },

  async reorder(items: ReorderInput['items']) {
    await Promise.all(
      items.map((item) =>
        prisma.fAQ.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        })
      )
    );
  },
};

// ============================================
// CORE VALUE
// ============================================

export const coreValueRepository = {
  async findMany(published?: boolean) {
    return prisma.coreValue.findMany({
      where: published !== undefined ? { isPublished: published } : undefined,
      orderBy: { sortOrder: 'asc' },
    });
  },

  async findById(id: string) {
    return prisma.coreValue.findUnique({ where: { id } });
  },

  async create(data: CreateCoreValueInput) {
    return prisma.coreValue.create({ data });
  },

  async update(id: string, data: UpdateCoreValueInput) {
    return prisma.coreValue.update({ where: { id }, data });
  },

  async delete(id: string) {
    await prisma.coreValue.delete({ where: { id } });
  },

  async reorder(items: ReorderInput['items']) {
    await Promise.all(
      items.map((item) =>
        prisma.coreValue.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        })
      )
    );
  },
};

// ============================================
// INDUSTRY SECTOR
// ============================================

export const industrySectorRepository = {
  async findMany(published?: boolean) {
    return prisma.industrySector.findMany({
      where: published !== undefined ? { isPublished: published } : undefined,
      orderBy: { sortOrder: 'asc' },
    });
  },

  async findById(id: string) {
    return prisma.industrySector.findUnique({ where: { id } });
  },

  async create(data: CreateIndustrySectorInput) {
    return prisma.industrySector.create({ data });
  },

  async update(id: string, data: UpdateIndustrySectorInput) {
    return prisma.industrySector.update({ where: { id }, data });
  },

  async delete(id: string) {
    await prisma.industrySector.delete({ where: { id } });
  },
};

// ============================================
// SERVICE OFFERING
// ============================================

export const serviceOfferingRepository = {
  async findMany(query: ServiceOfferingQuery = {}) {
    const { category, type, published } = query;
    return prisma.serviceOffering.findMany({
      where: {
        category: category || undefined,
        type: type || undefined,
        isPublished: published,
      },
      orderBy: [{ category: 'asc' }, { type: 'asc' }, { sortOrder: 'asc' }],
    });
  },

  async findById(id: string) {
    return prisma.serviceOffering.findUnique({ where: { id } });
  },

  async create(data: CreateServiceOfferingInput) {
    return prisma.serviceOffering.create({ data });
  },

  async update(id: string, data: UpdateServiceOfferingInput) {
    return prisma.serviceOffering.update({ where: { id }, data });
  },

  async delete(id: string) {
    await prisma.serviceOffering.delete({ where: { id } });
  },
};

// ============================================
// AWARD
// ============================================

export const awardRepository = {
  async findMany(published?: boolean) {
    return prisma.award.findMany({
      where: published !== undefined ? { isPublished: published } : undefined,
      orderBy: { sortOrder: 'asc' },
    });
  },

  async findById(id: string) {
    return prisma.award.findUnique({ where: { id } });
  },

  async create(data: CreateAwardInput) {
    return prisma.award.create({ data });
  },

  async update(id: string, data: UpdateAwardInput) {
    return prisma.award.update({ where: { id }, data });
  },

  async delete(id: string) {
    await prisma.award.delete({ where: { id } });
  },

  async reorder(items: ReorderInput['items']) {
    await Promise.all(
      items.map((item) =>
        prisma.award.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        })
      )
    );
  },
};
