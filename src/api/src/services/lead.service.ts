import { leadRepository } from '../repositories/lead.repository';
import type { LeadQuery } from '../models/lead.model';

export const leadService = {
  async list(query: LeadQuery) {
    return leadRepository.findMany(query);
  },

  async getById(id: string) {
    return leadRepository.findById(id);
  },

  async count(filters: Omit<LeadQuery, 'page' | 'limit' | 'sort' | 'order'>) {
    return leadRepository.count(filters);
  },

  async qualify(id: string) {
    // TODO: Call Claude API for real AI qualification
    // For now, simulate with random score
    const score = Math.floor(Math.random() * 40) + 60;
    const notes = generateQualificationNotes(score);
    return leadRepository.updateQualification(id, score, notes);
  },

  async qualifyBulk(ids: string[]) {
    const results = [];
    for (const id of ids) {
      const result = await this.qualify(id);
      results.push(result);
    }
    return results;
  },

  // Dashboard data
  async getStats() {
    const stats = await leadRepository.getStats();
    const campaignsRun = 0; // Will be populated from campaign run repository
    return {
      totalLeads: stats.totalLeads,
      qualifiedLeads: stats.qualifiedLeads,
      campaignsRun,
      exports: 0,
    };
  },

  async getLeadsOverTime(startDate: string, endDate: string) {
    return leadRepository.getLeadsOverTime(new Date(startDate), new Date(endDate));
  },

  async getBusinessTypeDistribution() {
    const types = await leadRepository.getDistinctBusinessTypes();
    const total = types.reduce((sum, t) => sum + t.value, 0);
    return types.map((t) => ({
      name: t.name,
      value: t.value,
      percentage: total > 0 ? Math.round((t.value / total) * 100) : 0,
    }));
  },

  async getLocationDistribution() {
    const states = await leadRepository.getDistinctStates();
    const total = states.reduce((sum, s) => sum + s.value, 0);
    return states.map((s) => ({
      name: s.name,
      value: s.value,
      percentage: total > 0 ? Math.round((s.value / total) * 100) : 0,
    }));
  },
};

function generateQualificationNotes(score: number): string {
  if (score >= 80) {
    return '• Strong online presence with professional website\n• High review count and excellent ratings\n• Established business with 5+ years operation\n• Good geographic coverage';
  } else if (score >= 60) {
    return '• Moderate online presence\n• Decent reviews and ratings\n• Growing business with potential\n• Limited service area';
  } else {
    return '• Limited online presence\n• Few reviews\n• New or small operation\n• May need more research';
  }
}
