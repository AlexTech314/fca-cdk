/**
 * AI Scoring Fargate Task
 *
 * Reads batch of lead IDs from S3, scores each lead using Claude Haiku 4.5,
 * updates Postgres. Sequential processing with 1.5s delay for rate limits.
 * Handles 429 with retry-after.
 */

import { GetObjectCommand } from '@aws-sdk/client-s3';
import { S3Client } from '@aws-sdk/client-s3';
import { bootstrapDatabaseUrl, prisma } from '@fca/db';

const s3Client = new S3Client({});
const CAMPAIGN_DATA_BUCKET = process.env.CAMPAIGN_DATA_BUCKET!;
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY!;
const CLAUDE_MODEL = 'claude-haiku-4-5-20251001';
const DELAY_MS = 1500;

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
  const maxRetries = 3;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: `You are an M&A lead qualification analyst for Flatirons Capital Advisors, an investment bank specializing in lower middle market transactions.

Score this business lead on a scale of 0-100 based on its acquisition potential. Consider:
- Revenue indicators (review count, price level as proxies)
- Online presence and professionalism
- Industry fit for M&A transactions
- Geographic market strength
- Owner operator characteristics

Business data:
${JSON.stringify(leadData, null, 2)}

Respond with ONLY valid JSON in this exact format:
{"score": <number 0-100>, "notes": "<bullet points explaining score>"}`,
          },
        ],
      }),
    });

    if (response.status === 429) {
      const retryAfter = response.headers.get('retry-after');
      const waitSec = retryAfter ? parseInt(retryAfter, 10) : 60;
      console.log(`Rate limited, waiting ${waitSec}s before retry (attempt ${attempt + 1}/${maxRetries})`);
      await sleep(waitSec * 1000);
      continue;
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Claude API error: ${response.status} - ${errorText}`);
    }

    const data = (await response.json()) as { content: Array<{ text: string }> };
    const text = data.content[0]?.text || '';

    try {
      return JSON.parse(text);
    } catch {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
      return { score: 50, notes: 'Unable to parse Claude response' };
    }
  }
  throw new Error('Max retries exceeded for Claude API');
}

async function main(): Promise<void> {
  await bootstrapDatabaseUrl();
  console.log('=== AI Scoring Task (Claude Haiku 4.5) ===');

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
