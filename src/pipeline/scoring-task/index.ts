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
const BEDROCK_MODEL_ID = 'us.anthropic.claude-3-haiku-20240307-v1:0';
const CONCURRENCY = 5;

const SCORING_PROMPT = `You are a PE deal sourcing analyst for Flatirons Capital Advisors, an investment bank specializing in lower middle market transactions ($5M-$250M enterprise value).

Evaluate this business as a potential PE acquisition target. Be rigorous and skeptical — most businesses are mediocre acquisition targets and most owners are not looking to sell. Your scores should reflect reality, not optimism.

## Calibration Guidance

Your scores across a large batch should approximate these distributions:
- Business Quality: ~30% score 1-3, ~40% score 4-6, ~25% score 7-8, ~5% score 9-10
- Sell Likelihood: ~50% score 1-3, ~30% score 4-5, ~15% score 6-7, ~5% score 8-10
A score of 5 is NOT "average" or "default" — it means meaningfully above-median evidence exists.

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
How attractive is this business as a PE acquisition target? Evaluate the evidence, not assumptions.

- **1-2 (Poor)**: Very small/marginal operation. No website or bare-minimum web presence. No reviews or poor ratings (<3.5). Sole proprietor with no employees. No differentiators. Likely under $1M revenue.
- **3-4 (Below average)**: Small local business. Basic website. Modest reviews (3.5-4.0 rating, <50 reviews). Few employees. Limited service offerings. Residential-focused. No clear competitive moat.
- **5-6 (Solid)**: Established business with professional presence. Good reviews (4.0+ rating, 50+ reviews). Multiple employees/team visible. Some commercial clients. Broader service mix or specialization. Evidence of $2M+ revenue potential.
- **7-8 (Strong)**: Multi-location or large operation. Excellent reputation (4.5+ rating, 100+ reviews). Visible management team beyond owner. Commercial/institutional client base. Certifications/licenses. Recurring revenue indicators (contracts, maintenance programs). Evidence of $5M+ revenue.
- **9-10 (Exceptional)**: Market leader in their area. Strong brand. Large team with management depth. Diversified revenue. Multi-location. Clear recurring revenue model. Evidence of $10M+ revenue. Would be a premium acquisition.

If there is not enough evidence to produce a real score, return -1. Do NOT guess or default to any number. A generic small business with a basic website and a few reviews is a 3-4, not a 5-6.

### 4. Sell Likelihood Score (1-10)
How likely is the owner to sell in the next 1-3 years? Be very skeptical — most owners are NOT selling. Score based only on concrete evidence, not speculation.

- **1-2 (Very unlikely)**: No sell signals. Growing business, young/energetic leadership, recently hired staff, expanding locations, recent investments, active marketing/growth.
- **3-4 (Unlikely)**: No sell signals but no strong counter-signals either. Long-tenured owner, business appears stable but not necessarily growing. This is where most businesses land.
- **5-6 (Possible)**: Indirect signals present. Owner running business 20+ years AND single-owner dependency AND no visible next-gen leadership. Or: stagnant web presence suggesting disengagement. Multiple soft signals needed — a single factor is not enough for 5+.
- **7-8 (Likely)**: Clear signals. Explicit retirement/transition language on website. "Serving the community since 1975" with founder still operating. Succession planning mentioned. Lifestyle business with aging owner showing reduced engagement.
- **9-10 (Very likely)**: Unmistakable signals. Business listed for sale. Owner publicly discussing exit/retirement. "Looking for the right partner to carry on our legacy." Active broker listing.

If there is not enough evidence to produce a real score, return -1. Do NOT guess or default to any number. Do NOT inflate beyond 3 without specific, concrete evidence. A business being old does not by itself mean the owner wants to sell.

### 5. Supporting Evidence
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
  "business_quality_score": <1-10 or -1>,
  "sell_likelihood_score": <1-10 or -1>,
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
          business_quality_score: -1,
          sell_likelihood_score: -1,
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
          scoringRationale: result.rationale,
          supportingUrls: result.supporting_urls,
          scoredAt: new Date(),
          pipelineStatus: 'idle',
        },
      });
      scored++;
      completed++;
      console.log(
        `[${completed}/${batch.length}] Scored lead ${lead_id}: BQ:${result.business_quality_score} SL:${result.sell_likelihood_score}${result.is_excluded ? ' [EXCLUDED]' : ''}`
      );
    } catch (err) {
      console.error(`Failed to score lead ${lead_id}:`, err);
      try {
        await db.lead.update({ where: { id: lead_id }, data: { pipelineStatus: 'idle' } });
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
