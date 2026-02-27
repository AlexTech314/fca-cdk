/**
 * AI Scoring Fargate Task
 *
 * Reads batch of lead IDs from S3, scores each lead using AWS Bedrock
 * (Claude 3 Haiku) with rubric-based PE lead qualification.
 * Reads raw scraped markdown from S3 for direct scoring.
 */

import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { S3Client } from '@aws-sdk/client-s3';
import { bootstrapDatabaseUrl } from '@fca/db';
import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient | undefined;

const s3Client = new S3Client({});
const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-2',
});
const CAMPAIGN_DATA_BUCKET = process.env.CAMPAIGN_DATA_BUCKET!;
const BEDROCK_MODEL_ID = 'anthropic.claude-3-haiku-20240307-v1:0';
const CONCURRENCY = 5;

const SCORING_PROMPT = `You are a PE deal sourcing analyst for Flatirons Capital Advisors, an investment bank specializing in lower middle market transactions ($5M-$250M enterprise value).

Evaluate this business as a potential PE acquisition target using the rubric below.

## Evaluation Steps

### 1. Identify Ownership
- Determine the controlling owner name (person, not company) if identifiable
- Classify ownership type: "founder-owned", "family-owned", "partner-owned", "PE-backed", "corporate subsidiary", "franchise", or "unknown"

### 2. Exclusion Check
Set is_excluded=true if ANY of these apply:
- Already acquired by or subsidiary of a PE firm or larger platform
- Active M&A process underway (e.g., "we've been acquired by...")
- Government entity or non-profit organization
- Franchise location (not the franchisor)
Provide a brief exclusion_reason if excluded.

### 3. Business Quality Score (1-10)
Consider: years in business, team size, service breadth, certifications/licenses, commercial client base, recurring revenue indicators, multi-location presence, online reputation (reviews/rating), professional website quality.

### 4. Sell Likelihood Score (1-10)
Consider: succession signals (retirement language, "looking to transition"), owner age indicators, single-owner dependency, founder still operating after 20+ years, no clear next-generation leadership, lifestyle business indicators.

### 5. Priority Score & Tier
- Priority Score = round((BQ * 0.4 + SL * 0.6) * 10)
- Tier 1: score >= 70 (high priority)
- Tier 2: score >= 40 (moderate)
- Tier 3: score < 40 (low)

### 6. Supporting Evidence
Include up to 5 URLs from the source material that best support your assessment.

## Lead Data
`;

interface BatchItem {
  lead_id: string;
  place_id: string;
}

interface ScoringResult {
  controlling_owner: string | null;
  ownership_type: string;
  is_excluded: boolean;
  exclusion_reason: string | null;
  business_quality_score: number;
  sell_likelihood_score: number;
  priority_score: number;
  priority_tier: number;
  rationale: string;
  supporting_urls: string[];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchMarkdownFromS3(s3Key: string): Promise<string | null> {
  try {
    const response = await s3Client.send(
      new GetObjectCommand({ Bucket: CAMPAIGN_DATA_BUCKET, Key: s3Key })
    );
    return (await response.Body?.transformToString()) ?? null;
  } catch (err) {
    console.warn(`Failed to fetch markdown from S3 (${s3Key}):`, err);
    return null;
  }
}

async function scoreLead(leadData: Record<string, unknown>, markdown: string | null): Promise<ScoringResult> {
  const backoffMs = [5000, 15000, 45000];

  let content = SCORING_PROMPT + JSON.stringify(leadData, null, 2);
  if (markdown) {
    content += `\n\n## Raw Website Content\n\n${markdown}`;
  }
  content += `\n\nRespond with ONLY valid JSON matching this schema:
{
  "controlling_owner": "<name or null>",
  "ownership_type": "<type>",
  "is_excluded": <true/false>,
  "exclusion_reason": "<reason or null>",
  "business_quality_score": <1-10>,
  "sell_likelihood_score": <1-10>,
  "priority_score": <0-100>,
  "priority_tier": <1-3>,
  "rationale": "<2-3 sentence summary>",
  "supporting_urls": ["<url1>", ...]
}`;

  for (let attempt = 0; attempt <= backoffMs.length; attempt++) {
    try {
      const response = await bedrockClient.send(
        new InvokeModelCommand({
          modelId: BEDROCK_MODEL_ID,
          contentType: 'application/json',
          accept: 'application/json',
          body: JSON.stringify({
            anthropic_version: 'bedrock-2023-05-31',
            max_tokens: 500,
            messages: [{ role: 'user', content: [{ type: 'text', text: content }] }],
          }),
        })
      );

      const decoded = JSON.parse(new TextDecoder().decode(response.body));
      const text = decoded.content?.[0]?.text || '';

      try {
        return JSON.parse(text);
      } catch {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) return JSON.parse(jsonMatch[0]);
        return {
          controlling_owner: null,
          ownership_type: 'unknown',
          is_excluded: false,
          exclusion_reason: null,
          business_quality_score: 5,
          sell_likelihood_score: 5,
          priority_score: 50,
          priority_tier: 2,
          rationale: 'Unable to parse Bedrock response',
          supporting_urls: [],
        };
      }
    } catch (err) {
      const isThrottle =
        err instanceof Error &&
        (err.name === 'ThrottlingException' || err.message?.includes('Throttling'));
      if (isThrottle && attempt < backoffMs.length) {
        const waitMs = backoffMs[attempt];
        console.log(
          `Bedrock throttled, waiting ${waitMs / 1000}s before retry (attempt ${attempt + 1}/${backoffMs.length})`
        );
        await sleep(waitMs);
        continue;
      }
      throw err;
    }
  }
  throw new Error('Max retries exceeded for Bedrock');
}

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
          leadEmails: { select: { value: true } },
          leadPhones: { select: { value: true } },
          leadSocialProfiles: { select: { platform: true, url: true } },
        },
      });
      if (!lead) {
        console.warn(`Lead ${lead_id} not found, skipping`);
        skipped++;
        return;
      }
      if (lead.scoredAt !== null) {
        console.log(`Lead ${lead_id} already scored, skipping`);
        await db.lead.update({ where: { id: lead_id }, data: { pipelineStatus: 'idle' } });
        skipped++;
        return;
      }

      const social = Object.fromEntries(
        lead.leadSocialProfiles.map((p) => [p.platform, p.url])
      );

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
        emails: lead.leadEmails.map((e) => e.value),
        phones: lead.leadPhones.map((p) => p.value),
        social,
        contact_page_url: lead.contactPageUrl,
      };

      let markdown: string | null = null;
      if (lead.scrapeMarkdownS3Key) {
        markdown = await fetchMarkdownFromS3(lead.scrapeMarkdownS3Key);
      }

      await db.lead.update({ where: { id: lead_id }, data: { pipelineStatus: 'scoring' } });
      const result = await scoreLead(leadData, markdown);
      await db.lead.update({
        where: { id: lead_id },
        data: {
          controllingOwner: result.controlling_owner,
          ownershipType: result.ownership_type,
          isExcluded: result.is_excluded,
          exclusionReason: result.exclusion_reason,
          businessQualityScore: result.business_quality_score,
          sellLikelihoodScore: result.sell_likelihood_score,
          priorityScore: result.priority_score,
          priorityTier: result.priority_tier,
          scoringRationale: result.rationale,
          supportingUrls: result.supporting_urls,
          scoredAt: new Date(),
          pipelineStatus: 'idle',
        },
      });
      scored++;
      completed++;
      console.log(
        `[${completed}/${batch.length}] Scored lead ${lead_id}: T${result.priority_tier} (BQ:${result.business_quality_score} SL:${result.sell_likelihood_score} P:${result.priority_score})${result.is_excluded ? ' [EXCLUDED]' : ''}`
      );
    } catch (err) {
      console.error(`Failed to score lead ${lead_id}:`, err);
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
