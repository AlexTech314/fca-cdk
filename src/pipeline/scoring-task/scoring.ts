import { ConverseCommand } from '@aws-sdk/client-bedrock-runtime';

import { bedrockClient, SCORING_MODEL_ID, sleep } from './config.js';
import type { ExtractionResult, ScoringResult } from './types.js';
import { SCORING_PROMPT_V2 } from './prompts.js';

export function buildFactsSummary(facts: ExtractionResult): string {
  const lines: string[] = [];

  // Owner
  if (facts.owner_names.length > 0) {
    lines.push(`Owner: ${facts.owner_names.join(', ')} (full name).${facts.first_name_only_contacts.length > 0 ? ` Also "${facts.first_name_only_contacts.join('", "')}" (first name only).` : ''}`);
  } else if (facts.first_name_only_contacts.length > 0) {
    lines.push(`Owner: Unknown. First-name-only contacts: "${facts.first_name_only_contacts.join('", "')}".`);
  } else {
    lines.push('Owner: Not identified.');
  }

  // Intermediation signals (high priority — placed early for scoring visibility)
  if (facts.intermediation_signals && facts.intermediation_signals.length > 0) {
    lines.push(`Intermediation signals: ${facts.intermediation_signals.join('; ')}.`);
  } else {
    lines.push('Intermediation signals: None.');
  }

  // Management titles
  if (facts.management_titles && facts.management_titles.length > 0) {
    lines.push(`Management titles: ${facts.management_titles.map((m) => `${m.name} (${m.title})`).join(', ')}.`);
  } else {
    lines.push('Management titles: No formal management titles found.');
  }

  // Team
  if (facts.team_members_named > 0) {
    lines.push(`Team: ${facts.team_members_named} named member${facts.team_members_named !== 1 ? 's' : ''}${facts.team_member_names.length > 0 ? ` (${facts.team_member_names.join(', ')})` : ''}.`);
  } else {
    lines.push('Team: No named team members.');
  }

  // Years / founded
  if (facts.years_in_business !== null) {
    lines.push(`Years: ${facts.years_in_business} years in business${facts.founded_year ? ` (founded ${facts.founded_year})` : ''}.`);
  } else if (facts.founded_year !== null) {
    lines.push(`Founded: ${facts.founded_year}.`);
  } else {
    lines.push('Years: Not stated.');
  }

  // Services
  if (facts.services.length > 0) {
    lines.push(`Services: ${facts.services.join(', ')} (${facts.services.length} line${facts.services.length !== 1 ? 's' : ''}).`);
  } else {
    lines.push('Services: None listed.');
  }

  // Clients
  if (facts.has_commercial_clients) {
    lines.push(`Clients: Commercial${facts.commercial_client_names.length > 0 ? ` — ${facts.commercial_client_names.join(', ')}` : ''}.`);
  } else {
    lines.push('Clients: Residential only, no commercial mentions.');
  }

  // Certifications
  if (facts.certifications.length > 0) {
    lines.push(`Certs: ${facts.certifications.join(', ')}.`);
  } else {
    lines.push('Certs: None.');
  }

  // Locations
  lines.push(`Locations: ${facts.location_count || 1}.`);

  // Pricing
  if (facts.pricing_signals.length > 0) {
    lines.push(`Pricing: ${facts.pricing_signals.join(', ')}.`);
  } else {
    lines.push('Pricing: No signals.');
  }

  // Website quality & red flags
  lines.push(`Website: ${facts.website_quality}.${facts.red_flags.length > 0 ? ` Red flags: ${facts.red_flags.join('; ')}.` : ''}`);

  // Copyright
  if (facts.copyright_year !== null) {
    lines.push(`Copyright year: ${facts.copyright_year}.`);
  }

  // Testimonials
  if (facts.testimonial_count > 0) {
    lines.push(`Testimonials: ${facts.testimonial_count} on site.`);
  } else {
    lines.push('Testimonials: None on site.');
  }

  // Recurring revenue
  if (facts.recurring_revenue_signals.length > 0) {
    lines.push(`Recurring revenue: ${facts.recurring_revenue_signals.join(', ')}.`);
  } else {
    lines.push('Recurring revenue: None.');
  }

  // Succession signals
  if (facts.succession_signals.length > 0) {
    lines.push(`Succession signals: ${facts.succession_signals.join('; ')}.`);
  } else {
    lines.push('Succession signals: None.');
  }

  // Process/governance
  if (facts.process_governance_signals.length > 0) {
    lines.push(`Process/governance: ${facts.process_governance_signals.join(', ')}.`);
  } else {
    lines.push('Process/governance: None.');
  }

  // Competitive pressure
  if (facts.competitive_pressure_signals.length > 0) {
    lines.push(`Competitive pressure: ${facts.competitive_pressure_signals.join('; ')}.`);
  } else {
    lines.push('Competitive pressure: None.');
  }

  // Business tone
  lines.push(`Business tone: ${facts.growth_vs_maintenance_language}.`);

  // Customer base
  lines.push(`Customer base: ${facts.customer_base || 'unknown'}.`);

  // Licensing/bonding
  if (facts.licensing_bonding && facts.licensing_bonding.length > 0) {
    lines.push(`Licensing/bonding: ${facts.licensing_bonding.join(', ')}.`);
  } else {
    lines.push('Licensing/bonding: None.');
  }

  // Scale indicators
  if (facts.scale_indicators && facts.scale_indicators.length > 0) {
    lines.push(`Scale indicators: ${facts.scale_indicators.join(', ')}.`);
  } else {
    lines.push('Scale indicators: None.');
  }

  // Industry affiliations
  if (facts.industry_affiliations && facts.industry_affiliations.length > 0) {
    lines.push(`Industry affiliations: ${facts.industry_affiliations.join(', ')}.`);
  } else {
    lines.push('Industry affiliations: None.');
  }

  return lines.join('\n');
}

type ScoringFields = Omit<ScoringResult, 'supporting_evidence'>;

const SCORING_SCHEMA: Record<keyof ScoringFields, 'string' | 'string?' | 'boolean' | 'number'> = {
  controlling_owner: 'string?',
  ownership_type: 'string',
  is_excluded: 'boolean',
  exclusion_reason: 'string?',
  business_quality_score: 'number',
  exit_readiness_score: 'number',
  rationale: 'string',
  is_intermediated: 'boolean',
  intermediation_signals_summary: 'string?',
  owner_email: 'string?',
  owner_phone: 'string?',
  owner_linkedin: 'string?',
  contact_confidence: 'string?',
};

/** Validate parsed scoring result against expected schema. Returns list of issues (empty = valid). */
function validateScoringResult(obj: unknown): string[] {
  if (typeof obj !== 'object' || obj === null) return ['Response is not a JSON object'];
  const record = obj as Record<string, unknown>;
  const issues: string[] = [];

  for (const [field, type] of Object.entries(SCORING_SCHEMA)) {
    if (!(field in record)) {
      issues.push(`Missing required field "${field}"`);
      continue;
    }
    const val = record[field];
    if (type === 'string?' && val !== null && typeof val !== 'string') {
      issues.push(`"${field}" must be string or null, got ${typeof val}`);
    } else if (type === 'string' && typeof val !== 'string') {
      issues.push(`"${field}" must be string, got ${val === null ? 'null' : typeof val}`);
    } else if (type === 'boolean' && typeof val !== 'boolean') {
      issues.push(`"${field}" must be boolean, got ${typeof val}`);
    } else if (type === 'number' && typeof val !== 'number') {
      issues.push(`"${field}" must be number, got ${typeof val}`);
    }
  }
  return issues;
}

/** Try to extract a JSON object from raw text (handles markdown fences, preamble, etc.) */
function extractJson(text: string): Record<string, unknown> {
  // Direct parse
  try { return JSON.parse(text); } catch { /* fall through */ }
  // Regex fallback — greedy match from first { to last }
  const match = text.match(/\{[\s\S]*\}/);
  if (match) return JSON.parse(match[0]);
  throw new Error('No JSON object found in response');
}

/** Single fix prompt that handles both JSON syntax errors and schema violations. */
async function fixScoringResponse(
  rawText: string,
  issues: string[],
): Promise<ScoringFields> {
  console.warn(`Scoring response fix needed (${issues.length} issue${issues.length !== 1 ? 's' : ''}): ${issues.join('; ')}`);

  const schemaExample = Object.entries(SCORING_SCHEMA)
    .map(([k, v]) => `  "${k}": <${v}>`)
    .join(',\n');

  const response = await bedrockClient.send(
    new ConverseCommand({
      modelId: SCORING_MODEL_ID,
      messages: [{
        role: 'user',
        content: [{ text:
          `The following JSON scoring response has problems. Fix ALL issues and return ONLY the corrected JSON object.\n\n` +
          `Issues:\n${issues.map((i) => `- ${i}`).join('\n')}\n\n` +
          `Expected schema:\n{\n${schemaExample}\n}\n\n` +
          `Original response:\n${rawText}`
        }],
      }],
      inferenceConfig: { maxTokens: 2048 },
    }),
  );

  const text = response.output?.message?.content?.[0]?.text || '';
  return extractJson(text) as ScoringFields;
}

export async function scoreLead(
  leadData: Record<string, unknown>,
  facts: ExtractionResult,
  factsSummary: string,
  marketContext: string,
): Promise<ScoringResult> {
  const backoffMs = [5000, 15000, 45000];

  let userContent = '';
  if (marketContext) {
    userContent += `${marketContext}\n\n`;
  }
  userContent += '## Extracted Facts\n\n' + factsSummary;
  userContent += '\n\n## Lead Data\n\n' + JSON.stringify(leadData, null, 2);

  for (let attempt = 0; attempt <= backoffMs.length; attempt++) {
    try {
      const response = await bedrockClient.send(
        new ConverseCommand({
          modelId: SCORING_MODEL_ID,
          system: [{ text: SCORING_PROMPT_V2 }],
          messages: [{
            role: 'user',
            content: [{ text: userContent }],
          }],
          inferenceConfig: { maxTokens: 2048 },
        }),
      );

      const text = response.output?.message?.content?.[0]?.text || '';

      // Parse → validate → fix (one retry if needed)
      let parsed: ScoringFields;
      let issues: string[];
      try {
        parsed = extractJson(text) as ScoringFields;
        issues = validateScoringResult(parsed);
      } catch (parseErr) {
        // JSON parse failed entirely — treat as schema issues for the fix prompt
        issues = [`JSON parse error: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`];
        parsed = {} as ScoringFields;
      }

      if (issues.length > 0) {
        parsed = await fixScoringResponse(text, issues);
        const fixIssues = validateScoringResult(parsed);
        if (fixIssues.length > 0) {
          throw new Error(`Scoring schema invalid after fix attempt: ${fixIssues.join('; ')}`);
        }
      }

      // Use notable_quotes from extraction pass as supporting_evidence
      // (these are verbatim from the raw markdown, not hallucinated by pass 2)
      return {
        ...parsed,
        supporting_evidence: facts.notable_quotes.map((q) => ({
          url: q.url,
          snippet: q.text,
        })),
      };
    } catch (err) {
      const isThrottle =
        err instanceof Error &&
        (err.name === 'ThrottlingException' || err.message?.includes('Throttling'));
      if (isThrottle && attempt < backoffMs.length) {
        const waitMs = backoffMs[attempt];
        console.log(
          `Bedrock throttled (scoring), waiting ${waitMs / 1000}s before retry (attempt ${attempt + 1}/${backoffMs.length})`,
        );
        await sleep(waitMs);
        continue;
      }
      throw err;
    }
  }
  throw new Error('Max retries exceeded for Bedrock (scoring)');
}
