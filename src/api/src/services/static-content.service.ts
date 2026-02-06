import {
  teamMemberRepository,
  communityServiceRepository,
  faqRepository,
  coreValueRepository,
  industrySectorRepository,
  serviceOfferingRepository,
} from '../repositories/static-content.repository';
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
  ReorderInput,
} from '../models/static-content.model';

// ============================================
// TEAM MEMBER SERVICE
// ============================================

export const teamMemberService = {
  list: (query?: TeamMemberQuery) => teamMemberRepository.findMany(query),
  getById: (id: string) => teamMemberRepository.findById(id),
  create: (data: CreateTeamMemberInput) => teamMemberRepository.create(data),
  update: (id: string, data: UpdateTeamMemberInput) => teamMemberRepository.update(id, data),
  delete: (id: string) => teamMemberRepository.delete(id),
  reorder: (items: ReorderInput['items']) => teamMemberRepository.reorder(items),
};

// ============================================
// COMMUNITY SERVICE SERVICE
// ============================================

export const communityServiceService = {
  list: (published?: boolean) => communityServiceRepository.findMany(published),
  getById: (id: string) => communityServiceRepository.findById(id),
  create: (data: CreateCommunityServiceInput) => communityServiceRepository.create(data),
  update: (id: string, data: UpdateCommunityServiceInput) => communityServiceRepository.update(id, data),
  delete: (id: string) => communityServiceRepository.delete(id),
};

// ============================================
// FAQ SERVICE
// ============================================

export const faqService = {
  list: (published?: boolean) => faqRepository.findMany(published),
  getById: (id: string) => faqRepository.findById(id),
  create: (data: CreateFAQInput) => faqRepository.create(data),
  update: (id: string, data: UpdateFAQInput) => faqRepository.update(id, data),
  delete: (id: string) => faqRepository.delete(id),
  reorder: (items: ReorderInput['items']) => faqRepository.reorder(items),
};

// ============================================
// CORE VALUE SERVICE
// ============================================

export const coreValueService = {
  list: (published?: boolean) => coreValueRepository.findMany(published),
  getById: (id: string) => coreValueRepository.findById(id),
  create: (data: CreateCoreValueInput) => coreValueRepository.create(data),
  update: (id: string, data: UpdateCoreValueInput) => coreValueRepository.update(id, data),
  delete: (id: string) => coreValueRepository.delete(id),
  reorder: (items: ReorderInput['items']) => coreValueRepository.reorder(items),
};

// ============================================
// INDUSTRY SECTOR SERVICE
// ============================================

export const industrySectorService = {
  list: (published?: boolean) => industrySectorRepository.findMany(published),
  getById: (id: string) => industrySectorRepository.findById(id),
  create: (data: CreateIndustrySectorInput) => industrySectorRepository.create(data),
  update: (id: string, data: UpdateIndustrySectorInput) => industrySectorRepository.update(id, data),
  delete: (id: string) => industrySectorRepository.delete(id),
};

// ============================================
// SERVICE OFFERING SERVICE
// ============================================

export const serviceOfferingService = {
  list: (query?: ServiceOfferingQuery) => serviceOfferingRepository.findMany(query),
  getById: (id: string) => serviceOfferingRepository.findById(id),
  create: (data: CreateServiceOfferingInput) => serviceOfferingRepository.create(data),
  update: (id: string, data: UpdateServiceOfferingInput) => serviceOfferingRepository.update(id, data),
  delete: (id: string) => serviceOfferingRepository.delete(id),
};
