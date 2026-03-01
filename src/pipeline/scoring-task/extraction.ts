import { InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { GetObjectCommand } from '@aws-sdk/client-s3';

import { s3Client, bedrockClient, CAMPAIGN_DATA_BUCKET, BEDROCK_MODEL_ID, sleep } from './config.js';
import type { ExtractionResult } from './types.js';
import { EMPTY_EXTRACTION } from './types.js';
import { EXTRACTION_PROMPT } from './prompts.js';

export async function fetchMarkdownFromS3(s3Key: string): Promise<string | null> {
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

export async function extractFacts(
  leadData: Record<string, unknown>,
  markdown: string,
): Promise<ExtractionResult> {
  const backoffMs = [5000, 15000, 45000];

  const content =
    EXTRACTION_PROMPT +
    '\n\n## Lead Basic Info\n\n' +
    JSON.stringify(
      { name: leadData.name, business_type: leadData.business_type, city: leadData.city, state: leadData.state },
      null,
      2,
    ) +
    '\n\n## Raw Website Content\n\n' +
    markdown;

  for (let attempt = 0; attempt <= backoffMs.length; attempt++) {
    try {
      const response = await bedrockClient.send(
        new InvokeModelCommand({
          modelId: BEDROCK_MODEL_ID,
          contentType: 'application/json',
          accept: 'application/json',
          body: JSON.stringify({
            anthropic_version: 'bedrock-2023-05-31',
            max_tokens: 1024,
            messages: [{ role: 'user', content: [{ type: 'text', text: content }] }],
          }),
        }),
      );

      const decoded = JSON.parse(new TextDecoder().decode(response.body));
      const text = decoded.content?.[0]?.text || '';

      try {
        return JSON.parse(text);
      } catch {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) return JSON.parse(jsonMatch[0]);
        console.warn('Failed to parse extraction response, using empty extraction');
        return EMPTY_EXTRACTION;
      }
    } catch (err) {
      const isThrottle =
        err instanceof Error &&
        (err.name === 'ThrottlingException' || err.message?.includes('Throttling'));
      if (isThrottle && attempt < backoffMs.length) {
        const waitMs = backoffMs[attempt];
        console.log(
          `Bedrock throttled (extraction), waiting ${waitMs / 1000}s before retry (attempt ${attempt + 1}/${backoffMs.length})`,
        );
        await sleep(waitMs);
        continue;
      }
      throw err;
    }
  }
  throw new Error('Max retries exceeded for Bedrock (extraction)');
}
