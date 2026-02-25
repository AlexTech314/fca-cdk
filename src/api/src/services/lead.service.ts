import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { prisma } from '@fca/db';
import { leadRepository } from '../repositories/lead.repository';
import { campaignRunRepository } from '../repositories/campaign.repository';
import type { LeadQuery, LeadDataType } from '../models/lead.model';

const SCORING_QUEUE_URL = process.env.SCORING_QUEUE_URL || '';
const SCRAPE_QUEUE_URL = process.env.SCRAPE_QUEUE_URL || '';
const sqsClient = new SQSClient({});

export const leadService = {
  async list(query: LeadQuery) {
    return leadRepository.findMany(query);
  },

  async getById(id: string) {
    return leadRepository.findById(id);
  },

  async count(filters: Omit<LeadQuery, 'page' | 'limit' | 'sort' | 'order' | 'fields'>) {
    return leadRepository.count(filters);
  },

  async qualify(id: string) {
    const lead = await leadRepository.findById(id);
    if (!lead) {
      throw new Error('Lead not found');
    }

    if (SCORING_QUEUE_URL) {
      await sqsClient.send(
        new SendMessageCommand({
          QueueUrl: SCORING_QUEUE_URL,
          MessageBody: JSON.stringify({ lead_id: id, place_id: lead.placeId ?? '' }),
        })
      );
      return lead;
    }

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

  async scrapeBulk(ids: string[]) {
    if (!SCRAPE_QUEUE_URL) {
      throw new Error('SCRAPE_QUEUE_URL is not configured');
    }

    const results: Array<{ id: string; status: 'queued' | 'skipped' | 'not_found' | 'error'; error?: string }> = [];

    for (const id of ids) {
      try {
        const lead = await leadRepository.findById(id);
        if (!lead) {
          results.push({ id, status: 'not_found' });
          continue;
        }
        if (!lead.website) {
          results.push({ id, status: 'skipped' });
          continue;
        }
        await sqsClient.send(
          new SendMessageCommand({
            QueueUrl: SCRAPE_QUEUE_URL,
            MessageBody: JSON.stringify({
              lead_id: id,
              place_id: lead.placeId ?? '',
              website: lead.website,
            }),
          })
        );
        results.push({ id, status: 'queued' });
      } catch (err) {
        results.push({ id, status: 'error', error: err instanceof Error ? err.message : 'Unknown error' });
      }
    }

    return results;
  },

  // Dashboard data
  async getStats() {
    const [stats, campaignsRun] = await Promise.all([
      leadRepository.getStats(),
      campaignRunRepository.countCompleted(),
    ]);
    return {
      totalLeads: stats.totalLeads,
      qualifiedLeads: stats.qualifiedLeads,
      campaignsRun,
      exports: 0,
    };
  },

  async getLeadsOverTime(startDate: string, endDate: string, granularity: 'hour' | 'day' = 'day') {
    return leadRepository.getLeadsOverTime(new Date(startDate), new Date(endDate), granularity);
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

  async getLeadScrapeRuns(leadId: string) {
    return leadRepository.getScrapeRunsByLeadId(leadId);
  },

  async getScrapeRunTree(runId: string) {
    return leadRepository.getScrapeRunTree(runId);
  },

  async getLeadProvenance(leadId: string) {
    return leadRepository.getLeadProvenance(leadId);
  },

  async deleteScrapeRun(runId: string) {
    const run = await prisma.scrapeRun.findUnique({ where: { id: runId }, select: { leadId: true } });
    if (!run) return null;
    await leadRepository.deleteScrapeRun(runId, run.leadId);
    return true;
  },

  async deleteScrapedPage(pageId: string) {
    const page = await prisma.scrapedPage.findUnique({ where: { id: pageId } });
    if (!page) return null;
    await leadRepository.deleteScrapedPage(pageId);
    return true;
  },

  async deleteLeadData(type: LeadDataType, id: string) {
    try {
      await leadRepository.deleteLeadData(type, id);
      return true;
    } catch {
      return null;
    }
  },

  async updateLeadData(type: LeadDataType, id: string, data: Record<string, unknown>) {
    try {
      return await leadRepository.updateLeadData(type, id, data);
    } catch {
      return null;
    }
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
