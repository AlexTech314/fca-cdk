/**
 * AI Scoring Fargate Task
 *
 * Two-pass AI Scoring Fargate Task
 *
 * Pass 1 (extraction): Reads raw scraped markdown from S3 and extracts
 * structured facts via Claude 3 Haiku on Bedrock.
 * Pass 2 (scoring): Scores extracted facts using a compressed rubric
 * with market context calibration.
 */

import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { bootstrapDatabaseUrl } from '@fca/db';
import { PrismaClient } from '@prisma/client';

import { s3Client, CAMPAIGN_DATA_BUCKET, CONCURRENCY } from './config.js';
import type { BatchItem, ExtractionResult } from './types.js';
import { EMPTY_EXTRACTION } from './types.js';
import { fetchMarkdownFromS3, extractFacts, extractContacts } from './extraction.js';
import { buildFactsSummary, scoreLead } from './scoring.js';
import { refreshMarketStats, refreshLeadRanks, buildMarketContext } from './market.js';

let prisma: PrismaClient | undefined;

async function main(): Promise<void> {
  await bootstrapDatabaseUrl();
  const db = new PrismaClient();
  prisma = db;
  console.log('=== AI Scoring Task (Bedrock Claude 3 Haiku) ===');

  const jobInputStr = process.env.JOB_INPUT;
  if (!jobInputStr) {
    console.error('JOB_INPUT required');
    process.exit(1);
  }

  const jobInput = JSON.parse(jobInputStr) as { batchS3Key?: string; taskId?: string };
  const { batchS3Key, taskId } = jobInput;

  if (!batchS3Key || !taskId) {
    console.error('batchS3Key and taskId required in JOB_INPUT');
    process.exit(1);
  }

  let batch: BatchItem[];
  try {
    const response = await s3Client.send(
      new GetObjectCommand({ Bucket: CAMPAIGN_DATA_BUCKET, Key: batchS3Key })
    );
    const body = await response.Body?.transformToString();
    if (!body) throw new Error('Empty batch file');
    batch = JSON.parse(body) as BatchItem[];
  } catch (err) {
    console.error('Failed to read batch from S3:', err);
    await db.fargateTask.update({
      where: { id: taskId },
      data: {
        status: 'failed',
        completedAt: new Date(),
        errorMessage: err instanceof Error ? err.message : String(err),
      },
    });
    process.exit(1);
  }

  console.log(`Loaded ${batch.length} leads to score (concurrency: ${CONCURRENCY})`);

  await refreshMarketStats(db);

  let scored = 0;
  let skipped = 0;
  let failed = 0;
  let completed = 0;

  async function processLead(lead_id: string): Promise<void> {
    try {
      const lead = await db.lead.findUnique({
        where: { id: lead_id },
        include: {
          locationCity: { select: { name: true } },
          locationState: { select: { name: true } },
          leadContacts: { select: { id: true, email: true, phone: true, linkedin: true, facebook: true, instagram: true, twitter: true } },
        },
      });
      if (!lead) {
        console.warn(`Lead ${lead_id} not found, skipping`);
        skipped++;
        return;
      }
      const emails = lead.leadContacts.filter((c) => c.email).map((c) => c.email!);
      const phones = lead.leadContacts.filter((c) => c.phone).map((c) => c.phone!);
      const social: Record<string, string> = {};
      for (const c of lead.leadContacts) {
        if (c.linkedin) social.linkedin = c.linkedin;
        if (c.facebook) social.facebook = c.facebook;
        if (c.instagram) social.instagram = c.instagram;
        if (c.twitter) social.twitter = c.twitter;
      }

      const leadData = {
        name: lead.name,
        business_type: lead.businessType,
        city: lead.locationCity?.name ?? null,
        state: lead.locationState?.name ?? lead.locationStateId ?? null,
        phone: lead.phone,
        website: lead.website,
        rating: lead.rating,
        review_count: lead.reviewCount,
        price_level: lead.priceLevel,
        editorial_summary: lead.editorialSummary,
        review_summary: lead.reviewSummary,
        emails,
        phones,
        social,
        contact_page_url: lead.contactPageUrl,
      };

      let markdown: string | null = null;
      if (lead.scrapeMarkdownS3Key) {
        markdown = await fetchMarkdownFromS3(lead.scrapeMarkdownS3Key);
      }

      await db.lead.update({ where: { id: lead_id }, data: { pipelineStatus: 'scoring' } });

      // Pass 1: Extract structured facts + contact names from raw markdown (parallel)
      const emailValues = emails;
      let facts: ExtractionResult;
      let contactResults: Awaited<ReturnType<typeof extractContacts>> = [];
      if (markdown) {
        const [factsResult, contactsResult] = await Promise.all([
          extractFacts(leadData, markdown),
          emailValues.length > 0 ? extractContacts(emailValues, markdown) : Promise.resolve([]),
        ]);
        facts = factsResult;
        contactResults = contactsResult;
      } else {
        facts = EMPTY_EXTRACTION;
      }

      // Persist extraction results to S3
      const extractedFactsS3Key = `extracted-facts/${lead_id}.json`;
      await s3Client.send(
        new PutObjectCommand({
          Bucket: CAMPAIGN_DATA_BUCKET,
          Key: extractedFactsS3Key,
          Body: JSON.stringify(facts, null, 2),
          ContentType: 'application/json',
        }),
      );

      const factsSummary = buildFactsSummary(facts);

      // Pass 2: Score using extracted facts + market context
      const marketContext = await buildMarketContext(
        db,
        lead.businessType,
        lead.reviewCount,
        lead.rating,
      );

      const result = await scoreLead(leadData, facts, factsSummary, marketContext);
      await db.lead.update({
        where: { id: lead_id },
        data: {
          controllingOwner: result.controlling_owner,
          ownershipType: result.ownership_type,
          isExcluded: result.is_excluded,
          exclusionReason: result.exclusion_reason,
          businessQualityScore: result.business_quality_score,
          exitReadinessScore: result.exit_readiness_score,
          compositeScore: result.is_excluded ? 0 : null,
          tier: result.is_excluded ? null : undefined,
          scoringRationale: result.rationale,
          supportingEvidence: result.supporting_evidence,
          isIntermediated: result.is_intermediated,
          intermediationSignals: result.intermediation_signals_summary,
          extractedFactsS3Key,
          scoredAt: new Date(),
          pipelineStatus: 'idle',
          scoringError: null,
        },
      });

      // Upsert best contact from scoring results
      if (result.owner_email || result.owner_phone || result.owner_linkedin) {
        // Clear any existing best contact
        await db.leadContact.updateMany({
          where: { leadId: lead_id, isBestContact: true },
          data: { isBestContact: null },
        });
        // Try to find an existing contact by email match
        const existingContact = result.owner_email
          ? await db.leadContact.findFirst({
              where: { leadId: lead_id, email: result.owner_email.toLowerCase() },
            })
          : null;
        if (existingContact) {
          await db.leadContact.update({
            where: { id: existingContact.id },
            data: {
              isBestContact: true,
              phone: result.owner_phone ?? existingContact.phone,
              linkedin: result.owner_linkedin ?? existingContact.linkedin,
            },
          });
        } else {
          await db.leadContact.create({
            data: {
              leadId: lead_id,
              email: result.owner_email ?? undefined,
              phone: result.owner_phone ?? undefined,
              linkedin: result.owner_linkedin ?? undefined,
              isBestContact: true,
            },
          });
        }
      }

      // Update LeadContact records with contact extraction results
      let contactsEnriched = 0;
      for (const contact of contactResults) {
        const matching = lead.leadContacts.find(
          (c) => c.email && c.email.toLowerCase() === contact.email.toLowerCase()
        );
        if (matching) {
          await db.leadContact.update({
            where: { id: matching.id },
            data: {
              firstName: contact.first_name,
              lastName: contact.last_name,
              description: contact.contact_type,
            },
          });
          contactsEnriched++;
        }
      }

      scored++;
      completed++;
      console.log(
        `[${completed}/${batch.length}] Scored lead ${lead_id}: BQ:${result.business_quality_score} ER:${result.exit_readiness_score}${result.is_excluded ? ' [EXCLUDED]' : ''}${contactsEnriched > 0 ? ` (${contactsEnriched} contacts enriched)` : ''}`
      );
    } catch (err) {
      console.error(`Failed to score lead ${lead_id}:`, err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      try {
        await db.lead.update({ where: { id: lead_id }, data: { pipelineStatus: 'scoring_failed', scoringError: errorMsg.slice(0, 500) } });
      } catch { /* best effort */ }
      failed++;
      completed++;
    }
  }

  // Process leads with bounded concurrency
  const pending = new Set<Promise<void>>();
  for (const { lead_id } of batch) {
    const p = processLead(lead_id).then(() => { pending.delete(p); });
    pending.add(p);
    if (pending.size >= CONCURRENCY) {
      await Promise.race(pending);
    }
  }
  await Promise.all(pending);

  await refreshMarketStats(db);
  await refreshLeadRanks(db);

  await db.fargateTask.update({
    where: { id: taskId },
    data: {
      status: 'completed',
      completedAt: new Date(),
      metadata: { scored, skipped, failed },
    },
  });

  console.log(`Done. Scored: ${scored}, Skipped: ${skipped}, Failed: ${failed}`);
}

main().catch(async (err) => {
  console.error('Task failed:', err);
  const jobInputStr = process.env.JOB_INPUT;
  let taskId: string | undefined;
  if (jobInputStr) {
    try {
      const jobInput = JSON.parse(jobInputStr) as { taskId?: string };
      taskId = jobInput.taskId;
    } catch {
      // ignore
    }
  }
  if (taskId && prisma) {
    try {
      await prisma.fargateTask.update({
        where: { id: taskId },
        data: {
          status: 'failed',
          completedAt: new Date(),
          errorMessage: err instanceof Error ? err.message : String(err),
        },
      });
    } catch (e) {
      console.error('Failed to update task status:', e);
    }
  }
  process.exit(1);
});
