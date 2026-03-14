/**
 * Contact Extraction Fargate Task
 *
 * Reads scraped page markdown for leads that have extracted emails,
 * uses Nova Lite (Bedrock) to associate emails with named contacts.
 */

import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { bootstrapDatabaseUrl } from '@fca/db';
import { PrismaClient } from '@prisma/client';

import type { BatchItem, ContactResult, LlmToolOutput } from './types.js';
import { SYSTEM_PROMPT, TOOL_SCHEMA, buildUserPrompt } from './prompts.js';

const s3Client = new S3Client({});
const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-2',
});
const CAMPAIGN_DATA_BUCKET = process.env.CAMPAIGN_DATA_BUCKET!;
const MODEL_ID = 'us.amazon.nova-lite-v1:0';
const CONCURRENCY = 15;

let prisma: PrismaClient | undefined;

async function readS3Text(key: string): Promise<string | null> {
  try {
    const resp = await s3Client.send(
      new GetObjectCommand({ Bucket: CAMPAIGN_DATA_BUCKET, Key: key })
    );
    return (await resp.Body?.transformToString()) ?? null;
  } catch {
    return null;
  }
}

async function callLlm(emails: string[], pageContents: { url: string; markdown: string }[]): Promise<ContactResult[]> {
  const userPrompt = buildUserPrompt(emails, pageContents);

  const resp = await bedrockClient.send(
    new ConverseCommand({
      modelId: MODEL_ID,
      system: [{ text: SYSTEM_PROMPT }],
      messages: [{ role: 'user', content: [{ text: userPrompt }] }],
      toolConfig: {
        tools: [{ toolSpec: { name: TOOL_SCHEMA.name, description: TOOL_SCHEMA.description, inputSchema: TOOL_SCHEMA.inputSchema } }],
        toolChoice: { tool: { name: TOOL_SCHEMA.name } },
      },
      inferenceConfig: { maxTokens: 4096, temperature: 0 },
    })
  );

  // Extract tool use result
  for (const block of resp.output?.message?.content ?? []) {
    if (block.toolUse && block.toolUse.name === TOOL_SCHEMA.name) {
      const input = block.toolUse.input as unknown as LlmToolOutput;
      return input.contacts ?? [];
    }
  }

  return [];
}

async function main(): Promise<void> {
  await bootstrapDatabaseUrl();
  const db = new PrismaClient();
  prisma = db;
  console.log('=== Contact Extraction Task (Bedrock Nova Lite) ===');

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

  console.log(`Loaded ${batch.length} leads for contact extraction (concurrency: ${CONCURRENCY})`);

  let extracted = 0;
  let skipped = 0;
  let failed = 0;
  let completed = 0;

  async function processLead(item: BatchItem): Promise<void> {
    const { lead_id, emails: emailValues, contactPages } = item;
    try {
      // Read markdown from S3 for each contact page
      const pageContents: { url: string; markdown: string }[] = [];
      for (const page of contactPages) {
        const markdown = await readS3Text(page.s3Key);
        if (markdown) {
          // Truncate very long pages to stay within token limits
          pageContents.push({ url: page.url, markdown: markdown.slice(0, 15000) });
        }
      }

      if (pageContents.length === 0) {
        skipped++;
        completed++;
        console.log(`[${completed}/${batch.length}] Lead ${lead_id}: could not read any page markdown, skipping`);
        return;
      }

      // Call LLM
      const contacts = await callLlm(emailValues, pageContents);

      // Update LeadEmail records with extracted names
      let updatedCount = 0;
      for (const contact of contacts) {
        try {
          await db.leadEmail.update({
            where: { leadId_value: { leadId: lead_id, value: contact.email.toLowerCase() } },
            data: {
              firstName: contact.first_name,
              lastName: contact.last_name,
              contactType: contact.contact_type,
            },
          });
          updatedCount++;
        } catch {
          // email may not exist in DB (race condition), skip
        }
      }

      extracted++;
      completed++;
      console.log(
        `[${completed}/${batch.length}] Lead ${lead_id}: ${updatedCount}/${emailValues.length} emails enriched`
      );
    } catch (err) {
      console.error(`Failed to process lead ${lead_id}:`, err);
      failed++;
      completed++;
    }
  }

  // Process leads with bounded concurrency
  const pending = new Set<Promise<void>>();
  for (const item of batch) {
    const p = processLead(item).then(() => { pending.delete(p); });
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
      metadata: { extracted, skipped, failed },
    },
  });

  console.log(`Done. Extracted: ${extracted}, Skipped: ${skipped}, Failed: ${failed}`);
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
