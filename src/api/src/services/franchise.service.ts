import { franchiseRepository } from '../repositories/franchise.repository';

export const franchiseService = {
  async list() {
    const franchises = await franchiseRepository.findMany();
    return franchises.map(({ _count, ...f }) => ({
      ...f,
      locationCount: _count.leads,
    }));
  },

  async getById(id: string) {
    const franchise = await franchiseRepository.findById(id);
    if (!franchise) return null;
    return {
      ...franchise,
      locationCount: franchise.leads.length,
    };
  },

  async linkLeads(id: string, leadIds: string[]) {
    const franchise = await franchiseRepository.findById(id);
    if (!franchise) throw new Error('Franchise not found');
    return franchiseRepository.linkLeads(id, leadIds);
  },

  async unlinkLead(leadId: string) {
    return franchiseRepository.unlinkLead(leadId);
  },
};
