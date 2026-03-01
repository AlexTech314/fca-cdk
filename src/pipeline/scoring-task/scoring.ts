import { InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

import { bedrockClient, BEDROCK_MODEL_ID, sleep } from './config.js';
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

  return lines.join('\n');
}

async function repairJson(broken: string, error: string): Promise<Omit<ScoringResult, 'supporting_evidence'>> {
  console.warn(`JSON repair needed: ${error}`);
  const response = await bedrockClient.send(
    new InvokeModelCommand({
      modelId: BEDROCK_MODEL_ID,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 1024,
        messages: [{ role: 'user', content: [{ type: 'text', text:
          `The following JSON output has a syntax error. Fix it and return ONLY the corrected JSON object, nothing else.\n\nParse error: ${error}\n\nBroken JSON:\n${broken}`
        }] }],
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
    throw new Error(`JSON repair failed: ${text.slice(0, 200)}`);
  }
}

export async function scoreLead(
  leadData: Record<string, unknown>,
  facts: ExtractionResult,
  factsSummary: string,
  marketContext: string,
): Promise<ScoringResult> {
  const backoffMs = [5000, 15000, 45000];

  let content = SCORING_PROMPT_V2;
  if (marketContext) {
    content += `\n\n${marketContext}\n\n`;
  }
  content += '## Extracted Facts\n\n' + factsSummary;
  content += '\n\n## Lead Data\n\n' + JSON.stringify(leadData, null, 2);

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

      // Parse the scoring result (no supporting_evidence in V2 output)
      let parsed: Omit<ScoringResult, 'supporting_evidence'>;
      try {
        parsed = JSON.parse(text);
      } catch (parseErr) {
        // Try extracting a JSON object from the response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            parsed = JSON.parse(jsonMatch[0]);
          } catch (innerErr) {
            // JSON object found but still malformed — ask Haiku to fix it
            parsed = await repairJson(jsonMatch[0], innerErr instanceof Error ? innerErr.message : String(innerErr));
          }
        } else {
          // No JSON object at all — ask Haiku to fix the raw text
          parsed = await repairJson(text, parseErr instanceof Error ? parseErr.message : String(parseErr));
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
