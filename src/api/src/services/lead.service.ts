import { SQSClient, SendMessageCommand, SendMessageBatchCommand } from '@aws-sdk/client-sqs';
import { S3Client, GetObjectCommand, PutObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { prisma } from '@fca/db';
import { leadRepository } from '../repositories/lead.repository';
import { campaignRunRepository } from '../repositories/campaign.repository';
import { generateCsv } from '../lib/csv';
import { generateExcel } from '../lib/xlsx';
import { generatePresignedDownloadUrl, ASSETS_BUCKET_NAME } from '../lib/s3';
import type { LeadQuery, LeadDataType } from '../models/lead.model';

const SCORING_QUEUE_URL = process.env.SCORING_QUEUE_URL || '';
const SCRAPE_QUEUE_URL = process.env.SCRAPE_QUEUE_URL || '';
const CONTACT_EXTRACTION_QUEUE_URL = process.env.CONTACT_EXTRACTION_QUEUE_URL || '';
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

  async getDistinctBusinessTypes(): Promise<string[]> {
    const rows = await prisma.$queryRaw<Array<{ business_type: string }>>`
      WITH RECURSIVE distinct_types AS (
        SELECT MIN(business_type) AS business_type FROM leads
        UNION ALL
        SELECT (SELECT MIN(business_type) FROM leads WHERE business_type > dt.business_type)
        FROM distinct_types dt
        WHERE dt.business_type IS NOT NULL
      )
      SELECT business_type FROM distinct_types WHERE business_type IS NOT NULL
      ORDER BY business_type
    `;
    return rows.map((r) => r.business_type);
  },

  async getDistinctPipelineStatuses(): Promise<string[]> {
    const rows = await prisma.$queryRaw<Array<{ pipeline_status: string }>>`
      WITH RECURSIVE vals AS (
        SELECT MIN(pipeline_status) AS pipeline_status FROM leads
        UNION ALL
        SELECT (SELECT MIN(pipeline_status) FROM leads WHERE pipeline_status > v.pipeline_status)
        FROM vals v WHERE v.pipeline_status IS NOT NULL
      )
      SELECT pipeline_status FROM vals WHERE pipeline_status IS NOT NULL
      ORDER BY pipeline_status
    `;
    return rows.map((r) => r.pipeline_status);
  },

  async getDistinctSources(): Promise<string[]> {
    const rows = await prisma.$queryRaw<Array<{ source: string }>>`
      WITH RECURSIVE vals AS (
        SELECT MIN(source) AS source FROM leads WHERE source IS NOT NULL
        UNION ALL
        SELECT (SELECT MIN(source) FROM leads WHERE source > v.source)
        FROM vals v WHERE v.source IS NOT NULL
      )
      SELECT source FROM vals WHERE source IS NOT NULL
      ORDER BY source
    `;
    return rows.map((r) => r.source);
  },

  async searchSearchQueries(q: string, limit = 20): Promise<Array<{ id: string; textQuery: string }>> {
    const pattern = `%${q}%`;
    const rows = await prisma.$queryRaw<Array<{ id: string; text_query: string }>>`
      SELECT DISTINCT sq.id, sq.text_query
      FROM search_queries sq
      INNER JOIN leads l ON l.search_query_id = sq.id
      WHERE sq.text_query ILIKE ${pattern}
      ORDER BY sq.text_query
      LIMIT ${limit}
    `;
    return rows.map((r) => ({ id: r.id, textQuery: r.text_query }));
  },

  async getSearchQueriesByIds(ids: string[]): Promise<Array<{ id: string; textQuery: string }>> {
    if (ids.length === 0) return [];
    const rows = await prisma.searchQuery.findMany({
      where: { id: { in: ids } },
      select: { id: true, textQuery: true },
      orderBy: { textQuery: 'asc' },
    });
    return rows;
  },

  async getDistinctTiers(): Promise<number[]> {
    const rows = await prisma.$queryRaw<Array<{ tier: number }>>`
      WITH RECURSIVE vals AS (
        SELECT MIN(tier) AS tier FROM leads WHERE tier IS NOT NULL
        UNION ALL
        SELECT (SELECT MIN(tier) FROM leads WHERE tier > v.tier)
        FROM vals v WHERE v.tier IS NOT NULL
      )
      SELECT tier FROM vals WHERE tier IS NOT NULL
      ORDER BY tier
    `;
    return rows.map((r) => r.tier);
  },

  async updateLead(id: string, data: Record<string, unknown>) {
    return prisma.lead.update({ where: { id }, data });
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
              enableAiScoring: false,
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
            MessageBody: JSON.stringify({ lead_id: l.id, place_id: l.placeId ?? '', website: l.website, enableAiScoring: false }),
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

  async extractContactsBulk(ids: string[]) {
    if (!CONTACT_EXTRACTION_QUEUE_URL) {
      throw new Error('CONTACT_EXTRACTION_QUEUE_URL is not configured');
    }

    const leads = await prisma.lead.findMany({
      where: { id: { in: ids } },
      select: { id: true, placeId: true, webScrapedAt: true },
    });
    const leadMap = new Map(leads.map(l => [l.id, l]));

    const results: Array<{ id: string; status: 'queued' | 'skipped' | 'not_found'; reason?: string }> = [];

    const toQueue: Array<{ id: string }> = [];
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
      toQueue.push({ id });
    }

    await Promise.all(toQueue.map(async ({ id }) => {
      await sqsClient.send(
        new SendMessageCommand({
          QueueUrl: CONTACT_EXTRACTION_QUEUE_URL,
          MessageBody: JSON.stringify({ lead_id: id, emails: [], contactPages: [], enableAiScoring: false }),
        })
      );
      results.push({ id, status: 'queued' });
    }));

    if (toQueue.length > 0) {
      await prisma.lead.updateMany({
        where: { id: { in: toQueue.map(l => l.id) } },
        data: { pipelineStatus: 'queued_for_contact_extraction' },
      });
    }

    return results;
  },

  async extractContactsAllByFilters(filters: Omit<LeadQuery, 'page' | 'limit' | 'sort' | 'order' | 'fields'>) {
    if (!CONTACT_EXTRACTION_QUEUE_URL) throw new Error('CONTACT_EXTRACTION_QUEUE_URL is not configured');

    const leads = await leadRepository.findLeadsForQueue(filters);
    const total = leads.length;
    const toQueue = leads.filter((l) => l.webScrapedAt);
    const skipped = total - toQueue.length;

    for (let i = 0; i < toQueue.length; i += 10) {
      const batch = toQueue.slice(i, i + 10);
      await sqsClient.send(
        new SendMessageBatchCommand({
          QueueUrl: CONTACT_EXTRACTION_QUEUE_URL,
          Entries: batch.map((l, idx) => ({
            Id: String(idx),
            MessageBody: JSON.stringify({ lead_id: l.id, emails: [], contactPages: [], enableAiScoring: false }),
          })),
        })
      );
    }

    const queuedIds = toQueue.map((l) => l.id);
    for (let i = 0; i < queuedIds.length; i += 1000) {
      await prisma.lead.updateMany({
        where: { id: { in: queuedIds.slice(i, i + 1000) } },
        data: { pipelineStatus: 'queued_for_contact_extraction' },
      });
    }

    return { queued: toQueue.length, skipped, total };
  },

  // Dashboard data
  async getStats() {
    const [stats, campaignsRun, searchesQueried, exports] = await Promise.all([
      leadRepository.getStats(),
      campaignRunRepository.countCompleted(),
      prisma.searchQuery.count(),
      s3Client.send(new ListObjectsV2Command({
        Bucket: ASSETS_BUCKET_NAME,
        Prefix: 'exports/',
      })).then(res => res.KeyCount ?? 0).catch(() => 0),
    ]);
    return {
      totalLeads: stats.totalLeads,
      leadsScored: stats.qualifiedLeads,
      campaignsRun,
      searchesQueried,
      exports,
    };
  },

  async getLeadsOverTime(startDate: string, endDate: string, granularity: 'hour' | 'day' = 'day') {
    return leadRepository.getLeadsOverTime(new Date(startDate), new Date(endDate), granularity);
  },

  async getSearchesOverTime(startDate: string, endDate: string, granularity: 'hour' | 'day' = 'day') {
    const truncExpr = granularity === 'hour' ? `date_trunc('hour', created_at)` : `date_trunc('day', created_at)`;
    const results: Array<{ bucket: Date; count: bigint }> = await prisma.$queryRawUnsafe(`
      SELECT ${truncExpr} AS bucket, COUNT(*)::bigint AS count
      FROM search_queries
      WHERE created_at >= $1 AND created_at <= $2
      GROUP BY 1
      ORDER BY 1 ASC
    `, new Date(startDate), new Date(endDate));
    return results.map((r) => ({
      timestamp: r.bucket instanceof Date ? r.bucket.toISOString() : String(r.bucket),
      value: Number(r.count),
    }));
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

  async createLeadContact(leadId: string, data: { email?: string; phone?: string; firstName?: string; lastName?: string }) {
    return leadRepository.createLeadContact(leadId, data);
  },

  async deleteLead(id: string) {
    return leadRepository.deleteLead(id);
  },

  async deleteLeadsBulk(ids: string[]) {
    const count = await leadRepository.deleteLeads(ids);
    return { deleted: count };
  },

  async createLead(data: { name: string; sortIndex: number }) {
    return prisma.lead.create({
      data: {
        placeId: `manual_${randomUUID()}`,
        name: data.name,
        source: 'manual',
        sortIndex: data.sortIndex,
      },
    });
  },

  async getNeighborSortIndex(
    sortIndex: number,
    direction: 'above' | 'below',
    filters: Omit<LeadQuery, 'page' | 'limit' | 'sort' | 'order' | 'fields'>
  ): Promise<number | null> {
    const result = await leadRepository.findNeighbor(sortIndex, direction, filters);
    return result?.sortIndex ?? null;
  },

  async exportLeads(
    filters: Omit<LeadQuery, 'page' | 'limit' | 'sort' | 'order' | 'fields'>,
    columns: string[],
    format: 'csv' | 'xlsx' = 'csv'
  ): Promise<{ downloadUrl: string; leadCount: number; fileName: string }> {
    const leads = await leadRepository.findForExport(filters);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    let body: string | Buffer;
    let contentType: string;
    let fileName: string;

    if (format === 'xlsx') {
      body = await generateExcel(leads, columns);
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      fileName = `leads-export-${timestamp}.xlsx`;
    } else {
      body = generateCsv(leads, columns);
      contentType = 'text/csv';
      fileName = `leads-export-${timestamp}.csv`;
    }

    const s3Key = `exports/${fileName}`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: ASSETS_BUCKET_NAME,
        Key: s3Key,
        Body: body,
        ContentType: contentType,
        ContentDisposition: `attachment; filename="${fileName}"`,
      })
    );

    const downloadUrl = await generatePresignedDownloadUrl(s3Key);
    return { downloadUrl, leadCount: leads.length, fileName };
  },
};
