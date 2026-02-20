/**
 * AI Scoring Fargate Task
 *
 * Reads batch of lead IDs from S3, scores each lead using AWS Bedrock
 * (Claude Sonnet 4.6), updates Postgres. Sequential processing with 500ms
 * delay. Handles ThrottlingException with exponential backoff.
 */

import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { S3Client } from '@aws-sdk/client-s3';
import { bootstrapDatabaseUrl, prisma } from '@fca/db';

const s3Client = new S3Client({});
const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-2',
});
const CAMPAIGN_DATA_BUCKET = process.env.CAMPAIGN_DATA_BUCKET!;
const BEDROCK_MODEL_ID = 'anthropic.claude-sonnet-4-6';
const DELAY_MS = 500;

const SCORING_PROMPT = `You are an M&A lead qualification analyst for Flatirons Capital Advisors,
an investment bank specializing in lower middle market transactions
($5M-$250M enterprise value).

Score this business lead 0-100 based on acquisition potential.

## Scoring Framework

### Google Places Data (high reliability)
- **Rating & Reviews**: Higher review counts suggest established businesses
  with meaningful revenue. 100+ reviews = likely $1M+ revenue.
  Rating quality indicates operational excellence.
- **Price Level**: Higher price points suggest better margins.
- **Business Type**: Some industries are more acquirable
  (services, healthcare, manufacturing > retail, restaurants).
- **Editorial Summary**: Google's own description -- look for indicators
  of scale, specialization, or market position.
- **Review Summary**: Customer sentiment themes.

### Web Scraped Data (if available)
- **Team & Headcount**: Owner-operator with small team (5-50 employees)
  is the M&A sweet spot. Named leadership = succession planning opportunity.
  Look for founder/owner titles.
- **Founded Year / Years in Business**: 10+ years = mature, stable cash flows.
  20+ years = likely succession candidate.
- **Acquisition Signals**: Prior M&A activity (acquired, sold, merged, rebranded)
  -- indicates deal-ready culture or PE-backed roll-up target.
- **New Hire Mentions**: Growth signal -- actively hiring suggests expansion.
- **Social Presence**: LinkedIn presence = B2B orientation (higher value).
  Multiple social channels = marketing sophistication.
- **Contact Quality**: Multiple contact methods, dedicated contact page
  = professional operation.
- **Services/Portfolio Pages**: Breadth of services indicates diversification.

### Geographic & Market Factors
- Major metro or growing secondary market = positive.
- Niche market dominance (evidenced by reviews, specialization) = very positive.

## Lead Data
`;

interface BatchItem {
  lead_id: string;
  place_id: string;
}

interface ClaudeScoreResult {
  score: number;
  notes: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function scoreLead(leadData: Record<string, unknown>): Promise<ClaudeScoreResult> {
  const backoffMs = [5000, 15000, 45000];
  const prompt = SCORING_PROMPT + JSON.stringify(leadData, null, 2) + `

Respond with ONLY valid JSON:
{"score": <0-100>, "notes": "<concise bullet points explaining score>"}`;

  for (let attempt = 0; attempt <= backoffMs.length; attempt++) {
    try {
      const response = await bedrockClient.send(
        new InvokeModelCommand({
          modelId: BEDROCK_MODEL_ID,
          contentType: 'application/json',
          accept: 'application/json',
          body: JSON.stringify({
            anthropic_version: 'bedrock-2023-05-31',
            max_tokens: 250,
            messages: [{ role: 'user', content: [{ type: 'text', text: prompt }] }],
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
        return { score: 50, notes: 'Unable to parse Bedrock response' };
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
  console.log('=== AI Scoring Task (Bedrock Claude Sonnet 4.6) ===');

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
    await prisma.fargateTask.update({
      where: { id: taskId },
      data: {
        status: 'failed',
        completedAt: new Date(),
        errorMessage: err instanceof Error ? err.message : String(err),
      },
    });
    process.exit(1);
  }

  console.log(`Loaded ${batch.length} leads to score`);

  let scored = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < batch.length; i++) {
    const { lead_id } = batch[i];
    if (i > 0) await sleep(DELAY_MS);

    try {
      const lead = await prisma.lead.findUnique({ where: { id: lead_id } });
      if (!lead) {
        console.warn(`Lead ${lead_id} not found, skipping`);
        skipped++;
        continue;
      }
      if (lead.qualificationScore !== null) {
        console.log(`Lead ${lead_id} already scored, skipping`);
        skipped++;
        continue;
      }

      const leadData = {
        name: lead.name,
        business_type: lead.businessType,
        city: lead.city,
        state: lead.state,
        phone: lead.phone,
        website: lead.website,
        rating: lead.rating,
        review_count: lead.reviewCount,
        price_level: lead.priceLevel,
        editorial_summary: lead.editorialSummary,
        review_summary: lead.reviewSummary,
        web_scraped_data: lead.webScrapedData,
      };

      const result = await scoreLead(leadData);
      await prisma.lead.update({
        where: { id: lead_id },
        data: {
          qualificationScore: result.score,
          qualificationNotes: result.notes,
          qualifiedAt: new Date(),
        },
      });
      scored++;
      console.log(`[${i + 1}/${batch.length}] Scored lead ${lead_id}: ${result.score}/100`);
    } catch (err) {
      console.error(`Failed to score lead ${lead_id}:`, err);
      failed++;
    }
  }

  await prisma.fargateTask.update({
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
  if (taskId) {
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
