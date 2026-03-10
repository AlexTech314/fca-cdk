import { InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { GetObjectCommand } from '@aws-sdk/client-s3';

import { s3Client, bedrockClient, CAMPAIGN_DATA_BUCKET, BEDROCK_MODEL_ID, sleep } from './config.js';
import type { ExtractionResult } from './types.js';
import { EMPTY_EXTRACTION } from './types.js';
import { EXTRACTION_PROMPT } from './prompts.js';

/** String-array fields that Haiku sometimes returns as objects instead of plain strings. */
const STRING_ARRAY_FIELDS: (keyof ExtractionResult)[] = [
  'owner_names', 'first_name_only_contacts', 'team_member_names',
  'services', 'commercial_client_names', 'certifications',
  'pricing_signals', 'red_flags', 'recurring_revenue_signals',
  'succession_signals', 'process_governance_signals',
  'competitive_pressure_signals', 'licensing_bonding',
  'scale_indicators', 'industry_affiliations', 'intermediation_signals',
];

/** Flatten an object to its most meaningful string value. */
function flattenToString(val: unknown): string {
  if (typeof val === 'string') return val;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (val && typeof val === 'object') {
    const obj = val as Record<string, unknown>;
    // Pick the most meaningful field — observation > text > quote > description > value, then any string
    for (const key of ['observation', 'text', 'quote', 'description', 'value', 'signal']) {
      if (typeof obj[key] === 'string') return obj[key] as string;
    }
    // Fallback: first string value found
    for (const v of Object.values(obj)) {
      if (typeof v === 'string' && v.length > 10) return v;
    }
  }
  return String(val);
}

/** Normalize notable_quotes to {url, text} format regardless of what Haiku returned. */
function normalizeQuotes(arr: unknown[]): { url: string; text: string }[] {
  return arr.map((item) => {
    if (typeof item === 'string') return { url: '', text: item };
    if (item && typeof item === 'object') {
      const obj = item as Record<string, unknown>;
      return {
        url: (obj.url ?? obj.source ?? '') as string,
        text: (obj.text ?? obj.quote ?? obj.observation ?? '') as string,
      };
    }
    return { url: '', text: String(item) };
  }).filter((q) => q.text.length > 0);
}

/** Normalize management_titles to {name, title} format. */
function normalizeTitles(arr: unknown[]): { name: string; title: string }[] {
  return arr.map((item) => {
    if (item && typeof item === 'object') {
      const obj = item as Record<string, unknown>;
      return {
        name: (obj.name ?? '') as string,
        title: (obj.title ?? obj.role ?? obj.position ?? '') as string,
      };
    }
    return { name: String(item), title: '' };
  }).filter((t) => t.name.length > 0 && t.title.length > 0);
}

/**
 * Normalize raw extraction output to match ExtractionResult types.
 * Fixes: objects in string[] fields, wrong keys in notable_quotes/management_titles,
 * and missing fields via EMPTY_EXTRACTION backfill.
 */
function normalizeExtraction(parsed: Record<string, unknown>): ExtractionResult {
  const result: Record<string, unknown> = { ...EMPTY_EXTRACTION };

  for (const key of Object.keys(EMPTY_EXTRACTION)) {
    if (!(key in parsed) || parsed[key] === undefined) continue;
    const val = parsed[key];

    if (key === 'notable_quotes' && Array.isArray(val)) {
      result[key] = normalizeQuotes(val);
    } else if (key === 'management_titles' && Array.isArray(val)) {
      result[key] = normalizeTitles(val);
    } else if (STRING_ARRAY_FIELDS.includes(key as keyof ExtractionResult) && Array.isArray(val)) {
      result[key] = val.map(flattenToString).filter((s: string) => s.length > 0);
    } else {
      result[key] = val;
    }
  }

  return result as unknown as ExtractionResult;
}

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
            max_tokens: 4096,
            messages: [{ role: 'user', content: [{ type: 'text', text: content }] }],
          }),
        }),
      );

      const decoded = JSON.parse(new TextDecoder().decode(response.body));
      const text = decoded.content?.[0]?.text || '';

      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(text);
      } catch {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            parsed = JSON.parse(jsonMatch[0]);
          } catch {
            console.warn('Failed to parse extraction response, using empty extraction');
            return EMPTY_EXTRACTION;
          }
        } else {
          console.warn('No JSON found in extraction response, using empty extraction');
          return EMPTY_EXTRACTION;
        }
      }

      return normalizeExtraction(parsed);
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
