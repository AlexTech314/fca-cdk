import { SQSClient, SendMessageCommand, SendMessageBatchCommand } from '@aws-sdk/client-sqs';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { prisma } from '@fca/db';
import { leadRepository } from '../repositories/lead.repository';
import { campaignRunRepository } from '../repositories/campaign.repository';
import type { LeadQuery, LeadDataType } from '../models/lead.model';

const SCORING_QUEUE_URL = process.env.SCORING_QUEUE_URL || '';
const SCRAPE_QUEUE_URL = process.env.SCRAPE_QUEUE_URL || '';
const CAMPAIGN_DATA_BUCKET = process.env.CAMPAIGN_DATA_BUCKET || '';
const sqsClient = new SQSClient({});
const s3Client = new S3Client({});

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

    if (!lead.webScrapedAt) {
      throw new Error('Lead has not been scraped yet');
    }

    if (!SCORING_QUEUE_URL) {
      throw new Error('SCORING_QUEUE_URL is not configured');
    }

    await sqsClient.send(
      new SendMessageCommand({
        QueueUrl: SCORING_QUEUE_URL,
        MessageBody: JSON.stringify({ lead_id: id, place_id: lead.placeId ?? '' }),
      })
    );
    await prisma.lead.update({ where: { id }, data: { pipelineStatus: 'queued_for_scoring', scoringError: null } });
    return lead;
  },

  async qualifyBulk(ids: string[]) {
    if (!SCORING_QUEUE_URL) {
      throw new Error('SCORING_QUEUE_URL is not configured');
    }

    const leads = await prisma.lead.findMany({
      where: { id: { in: ids } },
      select: { id: true, placeId: true, webScrapedAt: true },
    });
    const leadMap = new Map(leads.map(l => [l.id, l]));

    const results: Array<{ id: string; status: 'queued' | 'skipped' | 'not_found'; reason?: string }> = [];

    const toQueue: Array<{ id: string; placeId: string }> = [];
    for (const id of ids) {
      const lead = leadMap.get(id);
      if (!lead) {
        results.push({ id, status: 'not_found' });
        continue;
      }
      if (!lead.webScrapedAt) {
        results.push({ id, status: 'skipped', reason: 'not scraped' });
        continue;
      }
      toQueue.push({ id, placeId: lead.placeId ?? '' });
    }

    // Send to SQS and update status in parallel
    await Promise.all(toQueue.map(async ({ id, placeId }) => {
      await sqsClient.send(
        new SendMessageCommand({
          QueueUrl: SCORING_QUEUE_URL,
          MessageBody: JSON.stringify({ lead_id: id, place_id: placeId }),
        })
      );
      results.push({ id, status: 'queued' });
    }));

    if (toQueue.length > 0) {
      await prisma.lead.updateMany({
        where: { id: { in: toQueue.map(l => l.id) } },
        data: { pipelineStatus: 'queued_for_scoring', scoringError: null },
      });
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
        await prisma.lead.update({ where: { id }, data: { pipelineStatus: 'queued_for_scrape', scrapeError: null } });
        results.push({ id, status: 'queued' });
      } catch (err) {
        results.push({ id, status: 'error', error: err instanceof Error ? err.message : 'Unknown error' });
      }
    }

    return results;
  },

  async scrapeAllByFilters(filters: Omit<LeadQuery, 'page' | 'limit' | 'sort' | 'order' | 'fields'>) {
    if (!SCRAPE_QUEUE_URL) throw new Error('SCRAPE_QUEUE_URL is not configured');

    const leads = await leadRepository.findLeadsForQueue(filters);
    const total = leads.length;
    const toQueue = leads.filter((l) => l.website);
    const skipped = total - toQueue.length;

    // SQS batch send (max 10 per call)
    for (let i = 0; i < toQueue.length; i += 10) {
      const batch = toQueue.slice(i, i + 10);
      await sqsClient.send(
        new SendMessageBatchCommand({
          QueueUrl: SCRAPE_QUEUE_URL,
          Entries: batch.map((l, idx) => ({
            Id: String(idx),
            MessageBody: JSON.stringify({ lead_id: l.id, place_id: l.placeId ?? '', website: l.website }),
          })),
        })
      );
    }

    // Update pipelineStatus in chunks of 1000
    const queuedIds = toQueue.map((l) => l.id);
    for (let i = 0; i < queuedIds.length; i += 1000) {
      await prisma.lead.updateMany({
        where: { id: { in: queuedIds.slice(i, i + 1000) } },
        data: { pipelineStatus: 'queued_for_scrape', scrapeError: null },
      });
    }

    return { queued: toQueue.length, skipped, total };
  },

  async qualifyAllByFilters(filters: Omit<LeadQuery, 'page' | 'limit' | 'sort' | 'order' | 'fields'>) {
    if (!SCORING_QUEUE_URL) throw new Error('SCORING_QUEUE_URL is not configured');

    const leads = await leadRepository.findLeadsForQueue(filters);
    const total = leads.length;
    const toQueue = leads.filter((l) => l.webScrapedAt);
    const skipped = total - toQueue.length;

    for (let i = 0; i < toQueue.length; i += 10) {
      const batch = toQueue.slice(i, i + 10);
      await sqsClient.send(
        new SendMessageBatchCommand({
          QueueUrl: SCORING_QUEUE_URL,
          Entries: batch.map((l, idx) => ({
            Id: String(idx),
            MessageBody: JSON.stringify({ lead_id: l.id, place_id: l.placeId ?? '' }),
          })),
        })
      );
    }

    const queuedIds = toQueue.map((l) => l.id);
    for (let i = 0; i < queuedIds.length; i += 1000) {
      await prisma.lead.updateMany({
        where: { id: { in: queuedIds.slice(i, i + 1000) } },
        data: { pipelineStatus: 'queued_for_scoring', scoringError: null },
      });
    }

    return { queued: toQueue.length, skipped, total };
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

  async getLeadExtractedFacts(leadId: string): Promise<Record<string, unknown> | null> {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { extractedFactsS3Key: true },
    });
    if (!lead?.extractedFactsS3Key || !CAMPAIGN_DATA_BUCKET) return null;

    const response = await s3Client.send(new GetObjectCommand({
      Bucket: CAMPAIGN_DATA_BUCKET,
      Key: lead.extractedFactsS3Key,
    }));

    const body = await response.Body?.transformToString();
    if (!body) return null;
    return JSON.parse(body);
  },

  async getLeadScrapedMarkdown(leadId: string): Promise<string | null> {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { scrapeMarkdownS3Key: true },
    });
    if (!lead?.scrapeMarkdownS3Key || !CAMPAIGN_DATA_BUCKET) return null;

    const response = await s3Client.send(new GetObjectCommand({
      Bucket: CAMPAIGN_DATA_BUCKET,
      Key: lead.scrapeMarkdownS3Key,
    }));

    return response.Body?.transformToString() ?? null;
  },

  async getScrapedPageMarkdown(pageId: string): Promise<string | null> {
    const s3Key = await leadRepository.getScrapedPageMarkdownKey(pageId);
    if (!s3Key || !CAMPAIGN_DATA_BUCKET) return null;

    const response = await s3Client.send(new GetObjectCommand({
      Bucket: CAMPAIGN_DATA_BUCKET,
      Key: s3Key,
    }));

    return response.Body?.transformToString() ?? null;
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
