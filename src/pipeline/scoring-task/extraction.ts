import { ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import { GetObjectCommand } from '@aws-sdk/client-s3';

import { s3Client, bedrockClient, CAMPAIGN_DATA_BUCKET, EXTRACTION_MODEL_ID, sleep } from './config.js';
import type { ExtractionResult } from './types.js';
import { EMPTY_EXTRACTION } from './types.js';
import { PASS_A_SYSTEM_PROMPT, PASS_B_SYSTEM_PROMPT, PASS_C_SYSTEM_PROMPT } from './prompts.js';

// ============================================================
// Converse API Tool Schemas (one per sub-pass)
// ============================================================

const PASS_A_TOOL = {
  toolSpec: {
    name: 'extract_business_profile',
    description: 'Extract business profile facts from website content',
    inputSchema: {
      json: {
        type: 'object',
        properties: {
          owner_names: { type: 'array', items: { type: 'string' } },
          first_name_only_contacts: { type: 'array', items: { type: 'string' } },
          management_titles: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                title: { type: 'string' },
              },
              required: ['name', 'title'],
            },
          },
          team_members_named: { type: 'number' },
          team_member_names: { type: 'array', items: { type: 'string' } },
          years_in_business: { type: ['number', 'null'] },
          founded_year: { type: ['number', 'null'] },
          services: { type: 'array', items: { type: 'string' } },
          location_count: { type: 'number' },
          customer_base: { type: 'string', enum: ['b2b', 'b2c', 'mixed', 'unknown'] },
          website_quality: { type: 'string', enum: ['none', 'template/basic', 'professional', 'content-rich'] },
          copyright_year: { type: ['number', 'null'] },
          testimonial_count: { type: 'number' },
        },
        required: [
          'owner_names', 'first_name_only_contacts', 'management_titles',
          'team_members_named', 'team_member_names', 'years_in_business',
          'founded_year', 'services', 'location_count', 'customer_base',
          'website_quality', 'copyright_year', 'testimonial_count',
        ],
      },
    },
  },
} as const;

const PASS_B_TOOL = {
  toolSpec: {
    name: 'extract_strategic_signals',
    description: 'Extract strategic and investment signals from website content',
    inputSchema: {
      json: {
        type: 'object',
        properties: {
          intermediation_signals: { type: 'array', items: { type: 'string' } },
          succession_signals: { type: 'array', items: { type: 'string' } },
          process_governance_signals: { type: 'array', items: { type: 'string' } },
          competitive_pressure_signals: { type: 'array', items: { type: 'string' } },
          growth_vs_maintenance_language: { type: 'string', enum: ['growth', 'maintenance', 'decline', 'unknown'] },
          recurring_revenue_signals: { type: 'array', items: { type: 'string' } },
        },
        required: [
          'intermediation_signals', 'succession_signals', 'process_governance_signals',
          'competitive_pressure_signals', 'growth_vs_maintenance_language', 'recurring_revenue_signals',
        ],
      },
    },
  },
} as const;

const PASS_C_TOOL = {
  toolSpec: {
    name: 'extract_evidence_qualifications',
    description: 'Extract evidence, qualifications, and notable quotes from website content',
    inputSchema: {
      json: {
        type: 'object',
        properties: {
          has_commercial_clients: { type: 'boolean' },
          commercial_client_names: { type: 'array', items: { type: 'string' } },
          certifications: { type: 'array', items: { type: 'string' } },
          pricing_signals: { type: 'array', items: { type: 'string' } },
          red_flags: { type: 'array', items: { type: 'string' } },
          licensing_bonding: { type: 'array', items: { type: 'string' } },
          scale_indicators: { type: 'array', items: { type: 'string' } },
          industry_affiliations: { type: 'array', items: { type: 'string' } },
          notable_quotes: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                url: { type: 'string' },
                text: { type: 'string' },
              },
              required: ['url', 'text'],
            },
          },
        },
        required: [
          'has_commercial_clients', 'commercial_client_names', 'certifications',
          'pricing_signals', 'red_flags', 'licensing_bonding', 'scale_indicators',
          'industry_affiliations', 'notable_quotes',
        ],
      },
    },
  },
} as const;

// ============================================================
// Converse API extraction pass
// ============================================================

type ToolDef = typeof PASS_A_TOOL | typeof PASS_B_TOOL | typeof PASS_C_TOOL;

async function runExtractionPass(
  tool: ToolDef,
  systemPrompt: string,
  leadContext: string,
  markdown: string,
): Promise<Record<string, unknown>> {
  const backoffMs = [5000, 15000, 45000];

  for (let attempt = 0; attempt <= backoffMs.length; attempt++) {
    try {
      const response = await bedrockClient.send(new ConverseCommand({
        modelId: EXTRACTION_MODEL_ID,
        system: [{ text: systemPrompt }],
        messages: [{
          role: 'user',
          content: [{ text: leadContext + '\n\n## Raw Website Content\n\n' + markdown }],
        }],
        toolConfig: {
          tools: [{ toolSpec: tool.toolSpec as any }],
          toolChoice: { tool: { name: tool.toolSpec.name } },
        },
        inferenceConfig: { maxTokens: 5000 },
      }));

      // Extract tool use input from response
      const content = response.output?.message?.content;
      if (content) {
        for (const block of content) {
          if (block.toolUse?.input) {
            return block.toolUse.input as Record<string, unknown>;
          }
        }
      }

      console.warn(`No tool use found in ${tool.toolSpec.name} response`);
      return {};
    } catch (err) {
      const isThrottle =
        err instanceof Error &&
        (err.name === 'ThrottlingException' || err.message?.includes('Throttling'));
      if (isThrottle && attempt < backoffMs.length) {
        const waitMs = backoffMs[attempt];
        console.log(
          `Bedrock throttled (${tool.toolSpec.name}), waiting ${waitMs / 1000}s before retry (attempt ${attempt + 1}/${backoffMs.length})`,
        );
        await sleep(waitMs);
        continue;
      }
      throw err;
    }
  }
  throw new Error(`Max retries exceeded for Bedrock (${tool.toolSpec.name})`);
}

// ============================================================
// Thin safety normalization
// ============================================================

function safeNormalize(merged: Record<string, unknown>): Record<string, unknown> {
  // Coerce string numbers to actual numbers
  for (const key of ['team_members_named', 'years_in_business', 'founded_year', 'location_count', 'copyright_year', 'testimonial_count']) {
    if (typeof merged[key] === 'string') {
      const n = Number(merged[key]);
      merged[key] = isNaN(n) ? null : n;
    }
  }

  // Wrap single string values in arrays for array fields
  const arrayFields = [
    'owner_names', 'first_name_only_contacts', 'team_member_names', 'services',
    'commercial_client_names', 'certifications', 'pricing_signals', 'red_flags',
    'recurring_revenue_signals', 'succession_signals', 'process_governance_signals',
    'competitive_pressure_signals', 'licensing_bonding', 'scale_indicators',
    'industry_affiliations', 'intermediation_signals',
  ];
  for (const key of arrayFields) {
    if (typeof merged[key] === 'string') {
      merged[key] = [merged[key]];
    }
  }

  // Validate enums
  const validQualities = ['none', 'template/basic', 'professional', 'content-rich'];
  if (!validQualities.includes(merged.website_quality as string)) {
    merged.website_quality = 'none';
  }
  const validBases = ['b2b', 'b2c', 'mixed', 'unknown'];
  if (!validBases.includes(merged.customer_base as string)) {
    merged.customer_base = 'unknown';
  }
  const validTones = ['growth', 'maintenance', 'decline', 'unknown'];
  if (!validTones.includes(merged.growth_vs_maintenance_language as string)) {
    merged.growth_vs_maintenance_language = 'unknown';
  }

  return merged;
}

// ============================================================
// Public API
// ============================================================

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
  const leadContext =
    '## Lead Basic Info\n\n' +
    JSON.stringify(
      { name: leadData.name, business_type: leadData.business_type, city: leadData.city, state: leadData.state },
      null,
      2,
    );

  const [a, b, c] = await Promise.allSettled([
    runExtractionPass(PASS_A_TOOL, PASS_A_SYSTEM_PROMPT, leadContext, markdown),
    runExtractionPass(PASS_B_TOOL, PASS_B_SYSTEM_PROMPT, leadContext, markdown),
    runExtractionPass(PASS_C_TOOL, PASS_C_SYSTEM_PROMPT, leadContext, markdown),
  ]);

  // Log warnings for failed passes
  if (a.status === 'rejected') console.warn('Pass A (business profile) failed:', a.reason);
  if (b.status === 'rejected') console.warn('Pass B (strategic signals) failed:', b.reason);
  if (c.status === 'rejected') console.warn('Pass C (evidence/qualifications) failed:', c.reason);

  const merged = safeNormalize({
    ...EMPTY_EXTRACTION,
    ...(a.status === 'fulfilled' ? a.value : {}),
    ...(b.status === 'fulfilled' ? b.value : {}),
    ...(c.status === 'fulfilled' ? c.value : {}),
  });

  return merged as unknown as ExtractionResult;
}
