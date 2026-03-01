/**
 * AI Scoring Fargate Task
 *
 * Two-pass AI Scoring Fargate Task
 *
 * Pass 1 (extraction): Reads raw scraped markdown from S3 and extracts
 * structured facts via Claude 3 Haiku on Bedrock.
 * Pass 2 (scoring): Scores extracted facts using a compressed rubric
 * with market context calibration.
 */

import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
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

// ---------------------------------------------------------------------------
// Pass 1: Fact extraction — compress raw markdown into structured facts
// ---------------------------------------------------------------------------

interface ExtractionResult {
  owner_names: string[];
  first_name_only_contacts: string[];
  team_members_named: number;
  team_member_names: string[];
  years_in_business: number | null;
  founded_year: number | null;
  services: string[];
  has_commercial_clients: boolean;
  commercial_client_names: string[];
  certifications: string[];
  location_count: number;
  pricing_signals: string[];
  copyright_year: number | null;
  website_quality: string;
  red_flags: string[];
  testimonial_count: number;
  recurring_revenue_signals: string[];
  notable_quotes: { url: string; text: string }[];
}

const EMPTY_EXTRACTION: ExtractionResult = {
  owner_names: [],
  first_name_only_contacts: [],
  team_members_named: 0,
  team_member_names: [],
  years_in_business: null,
  founded_year: null,
  services: [],
  has_commercial_clients: false,
  commercial_client_names: [],
  certifications: [],
  location_count: 0,
  pricing_signals: [],
  copyright_year: null,
  website_quality: 'none',
  red_flags: ['No website data available'],
  testimonial_count: 0,
  recurring_revenue_signals: [],
  notable_quotes: [],
};

const EXTRACTION_PROMPT = `You are a data extraction assistant. Your job is to read a business's website content and extract structured facts. Do NOT interpret, score, or judge — just extract what is there and note what is absent.

## What to Extract

1. **Owner / contact names**: Full names (first + last) found anywhere on the site. Separately note first-name-only references ("Call Mike", "Ask for Raul") — these are different from full names.
2. **Team members**: Count of named team members (with bios, headshots, or listed on a team page). List their actual names.
3. **Years in business**: Look for "since XXXX", "established XXXX", "XX years of experience", "XX years in business". Distinguish between personal experience and business tenure if possible. Extract founded year if stated.
4. **Services**: List each distinct service line offered (e.g., "lawn mowing", "irrigation repair", "tree trimming"). Keep them specific, not categories.
5. **Commercial vs residential**: Does the site mention commercial, institutional, or government clients? List any named commercial clients (companies, municipalities, HOAs, property managers).
6. **Certifications / licenses**: Any certifications, licenses, or industry memberships mentioned (e.g., "Licensed & Insured", "NALP Certified", "EPA Lead-Safe").
7. **Locations**: How many office locations or branches are mentioned?
8. **Pricing signals**: Any language about pricing — "affordable", "competitive rates", "premium", "luxury", "budget-friendly", "free estimates". Extract the exact phrases used.
9. **Copyright year**: The year in the footer copyright notice (e.g., "© 2019").
10. **Website quality**: Classify as one of: "none", "template/basic", "professional", "content-rich". A template site has stock photos, minimal text, and few pages. A professional site has custom design, real photos, and detailed content. Content-rich adds case studies, portfolios, blogs, video.
11. **Red flags**: Placeholder content ("Lorem ipsum", "Your content here"), WordPress sample pages, broken links mentioned, stock photo watermarks, "under construction" pages, generic template text.
12. **Testimonials**: Count of testimonials/reviews shown on the site. Note who they reference (owner by name, company, specific employees).
13. **Recurring revenue signals**: Maintenance contracts, subscription programs, annual service agreements, retainer arrangements mentioned.
14. **Notable quotes**: Up to 5 verbatim quotes from the site that are most relevant to assessing business quality and scale. Include the source page URL (from the "Source:" line preceding each page's content). Copy quotes EXACTLY — do not paraphrase.

## Output Format

Respond with ONLY valid JSON matching the ExtractionResult schema:
{
  "owner_names": ["Full Name", ...],
  "first_name_only_contacts": ["Mike", ...],
  "team_members_named": 3,
  "team_member_names": ["Alice Smith", ...],
  "years_in_business": 15,
  "founded_year": 2009,
  "services": ["lawn mowing", "irrigation repair", ...],
  "has_commercial_clients": true,
  "commercial_client_names": ["City of Springfield", ...],
  "certifications": ["Licensed & Insured", ...],
  "location_count": 1,
  "pricing_signals": ["affordable", "free estimates"],
  "copyright_year": 2023,
  "website_quality": "professional",
  "red_flags": [],
  "testimonial_count": 5,
  "recurring_revenue_signals": ["annual maintenance contracts"],
  "notable_quotes": [{"url": "https://example.com/about", "text": "exact quote here"}, ...]
}

Use null for numbers you cannot determine, empty arrays for lists with no items, and 0 for counts with no evidence.`;

// ---------------------------------------------------------------------------
// Pass 2: Scoring — operates on extracted facts, not raw markdown
// ---------------------------------------------------------------------------

const SCORING_PROMPT_V2 = `You are a ruthlessly honest PE deal sourcing analyst for Flatirons Capital Advisors, an investment bank specializing in lower middle market transactions ($5M-$250M enterprise value). Your reputation depends on NOT wasting partners' time with unqualified leads.

Your job is to kill bad deals early. Most small businesses are NOT PE-viable and you must say so clearly.

## Hard Rules

- Absence of evidence IS evidence of absence. If the extracted facts show no team members, the business has none. If no commercial clients are listed, they don't have them. Do NOT give credit for things that MIGHT exist.
- Personal experience ≠ business tenure. "20 years of experience" ≠ 20-year-old business.
- "Affordable" / "competitive pricing" in pricing_signals = low margins = negative for PE.
- website_quality of "template/basic" or "none" is a 1-3 business. Only "professional" or "content-rich" can score higher.
- Google reviews are external validation. Use Market Context percentiles to judge review count. Below 25th percentile = minimal presence. No Market Context → fall back to <30 as minimal.
- first_name_only_contacts (e.g., "Call Mike") = strong sole proprietor signal = 1-2 business.

## Calibration (MANDATORY)

Business Quality distribution across batches:
- 1-2: ~35% (sole proprietors, one-truck, minimal web, <$1M revenue)
- 3-4: ~35% (small local, basic presence, residential, few employees)
- 5-6: ~20% (established, multiple employees, some commercial, $2M+ evidence)
- 7-8: ~8% (multi-location, management team, commercial contracts, $5M+)
- 9-10: ~2% (regional leaders, deep management, diversified revenue, $10M+)

Sell Likelihood distribution:
- 1-3: ~65% (no sell signals — this is the DEFAULT)
- 4-5: ~20% (one or two soft indirect signals)
- 6-7: ~10% (multiple concrete signals converging)
- 8-10: ~5% (explicit exit language, broker listing, retirement signals)

DEFAULT scores: 2-3 quality, 2 sell likelihood. Justify every point above with specific evidence from the extracted facts.

## Business Quality Score (1-10)

**1-2 (~35%):** ANY of: team_members_named=0, website_quality="none"/"template/basic", first_name_only_contacts present, reviews below 25th percentile, rating <3.5, pricing_signals include "affordable"/"competitive"/"budget", services has only 1 item, no commercial clients, residential-only.

**3-4 (~35%):** ALL required: website_quality >= "professional", reviews near/above median, team_members_named >= 2, services has 3+ items, serves meaningful area. Still missing: commercial clients, management depth, recurring revenue.

**5-6 (~20%):** ALL required: website_quality="professional"/"content-rich", team_members_named >= 4, reviews at 75th+ percentile, rating 4.0+, has_commercial_clients=true, services has 4+ items, years_in_business >= 5.

**7-8 (~8%):** MOST required: reviews at 90th+ percentile, rating 4.5+, team_members_named >= 6 (with management titles), commercial_client_names populated, certifications present, recurring_revenue_signals present.

**9-10 (~2%):** ALL required: recognized market leader, team_member_names shows 5+ leaders, diversified services + client base, strong recurring revenue, $10M+ revenue evidence.

Return -1 if insufficient evidence.

## Sell Likelihood Score (1-10)

If business_quality_score is 1-3, sell_likelihood is almost always 1-2 (too small for PE exit).

**1-2 (DEFAULT ~65%):** No sell signals.
**3-4 (~20%):** years_in_business >= 15 AND team_members_named <= 1, OR copyright_year stale (2+ years old), OR plateaued presence.
**5-6 (~10%):** MULTIPLE: years_in_business >= 20 AND sole owner dependency AND stale web AND legacy-focused language.
**7-8 (~4%):** EXPLICIT: retirement/transition language, founder past retirement age, owner disengagement signals.
**9-10 (~1%):** Business listed for sale, public exit discussion, broker engagement.

Return -1 if insufficient evidence.

## Evaluation Steps

1. Identify ownership from owner_names / first_name_only_contacts. Classify: "founder-owned", "family-owned", "partner-owned", "PE-backed", "corporate subsidiary", "franchise", or "unknown".
2. Exclusion check — is_excluded=true if PE-backed, acquired, government, non-profit, or franchise location.
3. Score business quality using extracted facts against the tiers above.
4. Score sell likelihood.
5. Write a 2-3 sentence brutally honest rationale. No softening.

Respond with ONLY valid JSON:
{
  "controlling_owner": "<name or null>",
  "ownership_type": "<type>",
  "is_excluded": <true/false>,
  "exclusion_reason": "<reason or null>",
  "business_quality_score": <1-10 or -1>,
  "sell_likelihood_score": <1-10 or -1>,
  "rationale": "<2-3 sentence summary>"
}`;

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
  supporting_evidence: { url: string; snippet: string }[];
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

async function extractFacts(
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

function buildFactsSummary(facts: ExtractionResult): string {
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

/** Percentile thresholds for review counts — 23 breakpoints from p0 to p99.9 */
const RC_PERCENTILES = [0, 1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 99, 99.9] as const;
const RC_KEYS = ['rcP00','rcP01','rcP05','rcP10','rcP15','rcP20','rcP25','rcP30','rcP35','rcP40','rcP45','rcP50','rcP55','rcP60','rcP65','rcP70','rcP75','rcP80','rcP85','rcP90','rcP95','rcP99','rcP999'] as const;

interface MarketStats {
  leadCount: number;
  rcP00: number; rcP01: number; rcP05: number; rcP10: number; rcP15: number;
  rcP20: number; rcP25: number; rcP30: number; rcP35: number; rcP40: number;
  rcP45: number; rcP50: number; rcP55: number; rcP60: number; rcP65: number;
  rcP70: number; rcP75: number; rcP80: number; rcP85: number; rcP90: number;
  rcP95: number; rcP99: number; rcP999: number;
  ratingMean: number;
  ratingMedian: number;
}

async function refreshMarketStats(db: PrismaClient): Promise<void> {
  console.log('Refreshing market stats materialized views...');
  await db.$executeRaw`REFRESH MATERIALIZED VIEW CONCURRENTLY market_stats_by_type`;
  await db.$executeRaw`REFRESH MATERIALIZED VIEW CONCURRENTLY market_stats_by_state`;
  await db.$executeRaw`REFRESH MATERIALIZED VIEW CONCURRENTLY market_stats_by_city`;
  console.log('Market stats refreshed');
}

async function refreshLeadRanks(db: PrismaClient): Promise<void> {
  console.log('Refreshing lead percentile ranks...');
  const result = await db.$executeRaw`
    WITH scored AS (
      SELECT id, business_type, location_city_id, location_state_id,
             business_quality_score, sell_likelihood_score
      FROM leads
      WHERE business_quality_score IS NOT NULL AND business_quality_score != -1
        AND sell_likelihood_score IS NOT NULL AND sell_likelihood_score != -1
        AND is_excluded = false
    ),
    type_counts AS (
      SELECT business_type, COUNT(*) AS cnt FROM scored
      WHERE business_type IS NOT NULL GROUP BY business_type
    ),
    city_counts AS (
      SELECT location_city_id, location_state_id, COUNT(*) AS cnt FROM scored
      WHERE location_city_id IS NOT NULL GROUP BY location_city_id, location_state_id
    ),
    ranked AS (
      SELECT s.id,
        CASE WHEN tc.cnt >= 5 THEN PERCENT_RANK() OVER (PARTITION BY s.business_type ORDER BY s.business_quality_score) * 100 ELSE NULL END AS q_type,
        CASE WHEN cc.cnt >= 5 THEN PERCENT_RANK() OVER (PARTITION BY s.location_city_id, s.location_state_id ORDER BY s.business_quality_score) * 100 ELSE NULL END AS q_city,
        CASE WHEN tc.cnt >= 5 THEN PERCENT_RANK() OVER (PARTITION BY s.business_type ORDER BY s.sell_likelihood_score) * 100 ELSE NULL END AS s_type,
        CASE WHEN cc.cnt >= 5 THEN PERCENT_RANK() OVER (PARTITION BY s.location_city_id, s.location_state_id ORDER BY s.sell_likelihood_score) * 100 ELSE NULL END AS s_city,
        COALESCE(tc.cnt, 0) AS type_cnt,
        COALESCE(cc.cnt, 0) AS city_cnt
      FROM scored s
      LEFT JOIN type_counts tc ON tc.business_type = s.business_type
      LEFT JOIN city_counts cc ON cc.location_city_id = s.location_city_id AND cc.location_state_id = s.location_state_id
    )
    UPDATE leads SET
      quality_percentile_by_type = ranked.q_type,
      quality_percentile_by_city = ranked.q_city,
      sell_percentile_by_type = ranked.s_type,
      sell_percentile_by_city = ranked.s_city,
      composite_score = (
        COALESCE(q_type * type_cnt, 0) + COALESCE(q_city * city_cnt, 0) +
        COALESCE(s_type * type_cnt, 0) + COALESCE(s_city * city_cnt, 0)
      ) / NULLIF(
        (CASE WHEN q_type IS NOT NULL THEN type_cnt ELSE 0 END) +
        (CASE WHEN q_city IS NOT NULL THEN city_cnt ELSE 0 END) +
        (CASE WHEN s_type IS NOT NULL THEN type_cnt ELSE 0 END) +
        (CASE WHEN s_city IS NOT NULL THEN city_cnt ELSE 0 END),
        0
      )
    FROM ranked WHERE leads.id = ranked.id
  `;
  console.log(`Lead percentile ranks refreshed: ${result} rows updated`);
}

function percentileBucket(value: number, stats: MarketStats): string {
  // Walk from highest percentile down to find where this value sits
  for (let i = RC_KEYS.length - 1; i >= 0; i--) {
    if (value >= stats[RC_KEYS[i]]) {
      const pct = RC_PERCENTILES[i];
      if (pct >= 99.9) return '99.9th+ percentile';
      if (pct >= 99) return '99th-99.9th percentile';
      // For the 0-95 range in steps of 5, show "Xth-Yth percentile"
      const nextPct = i < RC_KEYS.length - 1 ? RC_PERCENTILES[i + 1] : 100;
      return `${pct}th-${nextPct}th percentile`;
    }
  }
  return 'below minimum';
}

async function buildMarketContext(
  db: PrismaClient,
  businessType: string | null,
  reviewCount: number | null,
  rating: number | null,
): Promise<string> {
  if (!businessType) return '';

  const typeStats = await db.marketStatsByType.findUnique({
    where: { businessType },
  });
  if (!typeStats) return '';

  let section = `Among ${typeStats.leadCount} "${businessType}" businesses in our database:\n`;
  section += `- Review count distribution: p25=${Math.round(typeStats.rcP25)}, median=${Math.round(typeStats.rcP50)}, p75=${Math.round(typeStats.rcP75)}, p90=${Math.round(typeStats.rcP90)}, p99=${Math.round(typeStats.rcP99)}\n`;
  if (reviewCount !== null) {
    section += `- This lead's ${reviewCount} reviews = ${percentileBucket(reviewCount, typeStats)} for this trade\n`;
  }
  section += `- Rating: median ${typeStats.ratingMedian.toFixed(1)}`;
  if (rating !== null) {
    section += ` — this lead's ${rating.toFixed(1)} = ${rating >= typeStats.ratingMedian ? 'above' : 'below'} median`;
  }

  return '## Market Context\n\n' + section;
}

async function scoreLead(
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
      } catch {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          return {
            controlling_owner: null,
            ownership_type: 'unknown',
            is_excluded: false,
            exclusion_reason: null,
            business_quality_score: -1,
            sell_likelihood_score: -1,
            rationale: 'Unable to parse Bedrock response',
            supporting_evidence: [],
          };
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

  await refreshMarketStats(db);

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

      // Pass 1: Extract structured facts from raw markdown
      let facts: ExtractionResult;
      if (markdown) {
        facts = await extractFacts(leadData, markdown);
      } else {
        facts = EMPTY_EXTRACTION;
      }

      // Persist extraction results to S3
      const extractedFactsS3Key = `extracted-facts/${lead_id}.json`;
      await s3Client.send(
        new PutObjectCommand({
          Bucket: CAMPAIGN_DATA_BUCKET,
          Key: extractedFactsS3Key,
          Body: JSON.stringify(facts, null, 2),
          ContentType: 'application/json',
        }),
      );

      const factsSummary = buildFactsSummary(facts);

      // Pass 2: Score using extracted facts + market context
      const marketContext = await buildMarketContext(
        db,
        lead.businessType,
        lead.reviewCount,
        lead.rating,
      );

      const result = await scoreLead(leadData, facts, factsSummary, marketContext);
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
          supportingEvidence: result.supporting_evidence,
          extractedFactsS3Key,
          scoredAt: new Date(),
          pipelineStatus: 'idle',
          scoringError: null,
        },
      });
      scored++;
      completed++;
      console.log(
        `[${completed}/${batch.length}] Scored lead ${lead_id}: BQ:${result.business_quality_score} SL:${result.sell_likelihood_score}${result.is_excluded ? ' [EXCLUDED]' : ''}`
      );
    } catch (err) {
      console.error(`Failed to score lead ${lead_id}:`, err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      try {
        await db.lead.update({ where: { id: lead_id }, data: { pipelineStatus: 'scoring_failed', scoringError: errorMsg.slice(0, 500) } });
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

  await refreshMarketStats(db);
  await refreshLeadRanks(db);

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
