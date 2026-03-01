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

const SCORING_PROMPT = `You are a ruthlessly honest PE deal sourcing analyst for Flatirons Capital Advisors, an investment bank specializing in lower middle market transactions ($5M-$250M enterprise value). Your reputation depends on NOT wasting partners' time with unqualified leads.

Your job is to kill bad deals early. You are the filter — if you let a weak lead through, a senior partner wastes a week on it. Be brutally honest. Most small businesses are NOT PE-viable and you must say so clearly.

## Hard Rules

- Absence of evidence IS evidence of absence. If a business doesn't show team members, it's because they don't have them. If they don't list commercial clients, they don't have them. If their website is basic, their business is basic. Do NOT give credit for things that MIGHT exist but aren't shown.
- Personal experience ≠ business tenure. "20 years of experience" means the PERSON has worked in the trade for 20 years, often across multiple jobs. It does NOT mean the business has operated for 20 years or has any institutional value.
- "Affordable" / "competitive pricing" = low margins. This is a negative signal for PE, not a positive one. PE wants pricing power, not price competition.
- A website that merely exists is not "professional presence." A professional web presence means: polished design, staff/team pages, case studies or portfolio with descriptions, client testimonials integrated into the site, clear service pages with detail. A template site with stock photos and a phone number is the bare minimum — it's a 1-3.
- Google reviews are external validation. Use the Market Context section to determine whether review count is meaningful for its trade and location. Below 25th percentile = minimal market presence. If no Market Context is provided, fall back to <30 reviews as minimal. A 4.8 rating with 12 reviews means nothing — it's friends and family.
- First-name-only identification (e.g., "Call Raul", "Ask for Mike") is a strong indicator of a sole proprietor / one-person operation. This is a 1-2 business.

## Calibration (MANDATORY)

Your scores MUST approximate these distributions across batches. If you find yourself scoring most businesses 4-6, you are being too generous.

Business Quality distribution:
- 1-2: ~35% of businesses (sole proprietors, one-truck operations, minimal web presence, <$1M revenue)
- 3-4: ~35% of businesses (small local businesses with basic presence, residential-focused, few employees)
- 5-6: ~20% of businesses (genuinely established, multiple employees visible, some commercial work, $2M+ evidence)
- 7-8: ~8% of businesses (multi-location, management team, commercial contracts, $5M+ evidence)
- 9-10: ~2% of businesses (regional leaders, deep management, diversified revenue, $10M+ evidence)

Sell Likelihood distribution:
- 1-3: ~65% of businesses (no sell signals — this is the default, not 4-5)
- 4-5: ~20% of businesses (one or two soft indirect signals)
- 6-7: ~10% of businesses (multiple concrete signals converging)
- 8-10: ~5% of businesses (explicit exit language, broker listing, or unmistakable retirement signals)

The DEFAULT score for a business with no notable signals is 2-3 for quality and 2 for sell likelihood. You must justify every point above these defaults with specific evidence.

## Evaluation Steps

### 1. Identify Ownership
- Determine the controlling owner name (full name, not first-name-only) if identifiable
- Classify ownership type: "founder-owned", "family-owned", "partner-owned", "PE-backed", "corporate subsidiary", "franchise", or "unknown"
- If only a first name is visible with no last name, that itself is a red flag for a micro-operation

### 2. Exclusion Check
Set is_excluded=true if ANY of these apply:
- Already acquired by or subsidiary of a PE firm or larger platform
- Active M&A process underway (e.g., "we've been acquired by...")
- Government entity or non-profit organization
- Franchise location (not the franchisor)
Provide a brief exclusion_reason if excluded.

### 3. Business Quality Score (1-10)
How attractive is this as a PE acquisition target? Score based ONLY on concrete evidence. Every point above 3 requires specific justification.

**1-2 (Not PE-viable — ~35% of businesses):**
ANY of the following puts a business here:
- Sole proprietor / owner-operator with no visible employees
- No website OR a bare-minimum / template website with little real content
- First-name-only contact ("Call Mike", "Ask for Raul") — signals one-person shop
- Below 25th percentile for reviews in its business type (fall back to <30 if no Market Context)
- Rating below 3.5
- Emphasizes "affordable" or "low prices" (signals low margins, commodity positioning)
- No service area breadth — single trade, single offering
- No visible equipment, fleet, or infrastructure beyond the owner
- Residential-only with no evidence of commercial work
This is where most landscapers, handymen, solo contractors, and one-truck operations land. Be honest about it.

**3-4 (Small local business, not yet PE-scale — ~35%):**
ALL of the following must be true to score 3-4 (not just one):
- Functional website with real content (not just a landing page)
- Near or above median for reviews in its business type (fall back to 30-75 if no Market Context), 3.5+ rating
- Evidence of at least a few employees (team photo, "our team", staff bios)
- Multiple distinct service lines listed with detail
- Serves a meaningful geographic area
Still missing: commercial clients, management depth, scale indicators, recurring revenue

**5-6 (Established, approaching PE-relevance — ~20%):**
REQUIRES concrete evidence of ALL of the following:
- Professional, content-rich website with team/about pages showing multiple named employees
- 75th+ percentile for reviews in its business type (fall back to 75+ if no Market Context), 4.0+ rating
- Some commercial or institutional clients (named or referenced)
- Broader service mix OR clear specialization with pricing power
- Evidence suggesting $2M+ annual revenue (fleet size, employee count, project scale, service area)
- Has been operating as a business (not just the owner's experience) for 5+ years

**7-8 (Strong PE target — ~8%):**
REQUIRES evidence of MOST of the following:
- Multi-location or large service territory with infrastructure to support it
- 90th+ percentile for reviews in its business type (fall back to 100+ if no Market Context), 4.5+ rating
- Named management team beyond the owner (GM, ops manager, sales director, etc.)
- Commercial/institutional client base explicitly shown (municipalities, HOAs, property management companies)
- Certifications, licenses, industry memberships prominently displayed
- Recurring revenue indicators: maintenance contracts, subscription programs, retainer clients
- Evidence suggesting $5M+ annual revenue
- Professional marketing: case studies, project portfolios with detail, video content

**9-10 (Premium acquisition — ~2%):**
REQUIRES clear evidence of ALL:
- Recognized market leader / dominant brand in their region
- Deep management team with org chart or leadership page showing 5+ named leaders
- Diversified revenue: multiple service lines, commercial + residential, geographic diversity
- Multi-location with visible infrastructure (offices, yards, fleet)
- Clear recurring revenue model comprising significant portion of business
- Evidence suggesting $10M+ annual revenue
- Would command a premium multiple in an M&A process

If there is not enough evidence to produce a real score, return -1. A generic small business with a basic website and a handful of reviews is a 2-3, not a 4-5.

### 4. Sell Likelihood Score (1-10)
How likely is the owner to sell in the next 1-3 years? The DEFAULT answer is "not likely" (2). Most owners are NOT selling and you must not pretend otherwise.

**CRITICAL: A business that is too small for PE is also too small to sell to PE.** If business_quality_score is 1-3, sell_likelihood is almost always irrelevant — but still score it honestly. A sole proprietor "retiring" is not a PE exit, it's just closing up shop.

**1-2 (Not selling — ~65% of businesses, this is the DEFAULT):**
- No sell signals present. This is where you start, not 3-4.
- Active growth signals: recently hired staff, new locations, active marketing, new equipment/fleet
- Young or energetic leadership with long runway
- Recent investments in the business (remodel, new website, expanded services)

**3-4 (Unlikely but not impossible — ~20%):**
Requires at least ONE concrete soft signal:
- Owner has been operating 15+ years AND is the sole key person (no #2 visible)
- Website hasn't been updated in 2+ years (check copyright dates, blog posts, "latest news")
- Business appears to have plateaued (same services, same area, no visible growth)
- Owner is visibly older with no next-generation involvement
One factor alone only gets you to 3, not 4. Multiple factors required for 4.

**5-6 (Possible — ~10%):**
Requires MULTIPLE converging signals:
- Owner operating 20+ years AND single-owner dependency AND no visible next-gen leadership
- Stagnant web presence AND reduced marketing activity
- Language suggesting legacy focus: "serving since 19XX", emphasis on history vs. future
- Business model is mature/stable but not growing
All of these together might justify a 5-6. Any single one alone is a 3-4 at best.

**7-8 (Likely — rare, ~4%):**
Requires EXPLICIT signals:
- Retirement or transition language on website or in communications
- "Looking for the right partner" / "next chapter" / succession language
- Founder clearly at or past retirement age with no succession plan visible
- Lifestyle business showing signs of owner disengagement (unmaintained website, declining review frequency)

**9-10 (Actively exiting — ~1%):**
Requires UNMISTAKABLE evidence:
- Business explicitly listed for sale (broker listing, BizBuySell, etc.)
- Owner publicly discussing exit or retirement
- "Under new management" transition in progress
- Active broker or M&A advisor engagement referenced

If there is not enough evidence to produce a real score, return -1. Do NOT score above 2 without citing the specific evidence that justifies it.

### 5. Supporting Evidence
Provide up to 5 pieces of evidence from the source material. For each, include:
- The source page URL (from the "Source:" line in the website content)
- A verbatim snippet copied exactly from the source — do NOT paraphrase, edit, or summarize the snippet. Copy it character-for-character.

### 6. Rationale
Write a 2-3 sentence brutally honest assessment. Do not soften language. If it's a one-person operation say "one-person operation." If the website is bad say "poor website." If there's no evidence of scale say "no evidence of scale." The partners reading this want the truth, not diplomacy.

## Using Market Context

When a "Market Context" section is provided below, USE IT to calibrate your review count and rating assessments. The context shows percentiles at four levels: by business type, by state, by city, and overall. Prioritize the most specific level available (business type > city > state > overall). A lead at the 75th percentile for reviews in its business type is genuinely above average even if the raw number seems low — and a lead at the 25th percentile is below average even if the raw number seems high. When no Market Context is provided (insufficient data), fall back to the absolute thresholds given in the scoring tiers above.
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

interface MarketStats {
  leadCount: number;
  reviewCountP25: number;
  reviewCountMedian: number;
  reviewCountP75: number;
  reviewCountP90: number;
  reviewCountMean: number;
  ratingMean: number;
  ratingMedian: number;
}

const STATS_STALENESS_MS = 5 * 60 * 1000; // 5 minutes

async function refreshMarketStats(db: PrismaClient): Promise<void> {
  // Check staleness — skip if refreshed within the last hour
  const latest = await db.marketStatsByType.findFirst({
    orderBy: { refreshedAt: 'desc' },
    select: { refreshedAt: true },
  });
  if (latest && Date.now() - latest.refreshedAt.getTime() < STATS_STALENESS_MS) {
    console.log('Market stats still fresh, skipping refresh');
    return;
  }

  console.log('Refreshing market stats...');
  const now = new Date();

  // --- By business type ---
  const byType = await db.$queryRaw<Array<{
    business_type: string;
    lead_count: bigint;
    p25: number;
    median: number;
    p75: number;
    p90: number;
    mean: number;
    rating_mean: number;
    rating_median: number;
    scored_count: bigint;
    avg_quality: number | null;
    avg_sell: number | null;
  }>>`
    SELECT
      business_type,
      COUNT(*)::bigint AS lead_count,
      PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY review_count) AS p25,
      PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY review_count) AS median,
      PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY review_count) AS p75,
      PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY review_count) AS p90,
      AVG(review_count)::double precision AS mean,
      AVG(rating)::double precision AS rating_mean,
      PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY rating) AS rating_median,
      COUNT(CASE WHEN business_quality_score IS NOT NULL AND business_quality_score != -1 THEN 1 END)::bigint AS scored_count,
      AVG(CASE WHEN business_quality_score IS NOT NULL AND business_quality_score != -1 THEN business_quality_score END)::double precision AS avg_quality,
      AVG(CASE WHEN sell_likelihood_score IS NOT NULL AND sell_likelihood_score != -1 THEN sell_likelihood_score END)::double precision AS avg_sell
    FROM leads
    WHERE business_type IS NOT NULL
      AND review_count IS NOT NULL
      AND rating IS NOT NULL
    GROUP BY business_type
    HAVING COUNT(*) >= 5
  `;

  for (const row of byType) {
    await db.marketStatsByType.upsert({
      where: { businessType: row.business_type },
      create: {
        businessType: row.business_type,
        leadCount: Number(row.lead_count),
        reviewCountP25: row.p25,
        reviewCountMedian: row.median,
        reviewCountP75: row.p75,
        reviewCountP90: row.p90,
        reviewCountMean: row.mean,
        ratingMean: row.rating_mean,
        ratingMedian: row.rating_median,
        scoredLeadCount: Number(row.scored_count),
        avgQualityScore: row.avg_quality,
        avgSellLikelihood: row.avg_sell,
        refreshedAt: now,
      },
      update: {
        leadCount: Number(row.lead_count),
        reviewCountP25: row.p25,
        reviewCountMedian: row.median,
        reviewCountP75: row.p75,
        reviewCountP90: row.p90,
        reviewCountMean: row.mean,
        ratingMean: row.rating_mean,
        ratingMedian: row.rating_median,
        scoredLeadCount: Number(row.scored_count),
        avgQualityScore: row.avg_quality,
        avgSellLikelihood: row.avg_sell,
        refreshedAt: now,
      },
    });
  }

  // --- By state ---
  const byState = await db.$queryRaw<Array<{
    location_state_id: string;
    lead_count: bigint;
    p25: number;
    median: number;
    p75: number;
    p90: number;
    mean: number;
    rating_mean: number;
    rating_median: number;
    scored_count: bigint;
    avg_quality: number | null;
    avg_sell: number | null;
  }>>`
    SELECT
      location_state_id,
      COUNT(*)::bigint AS lead_count,
      PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY review_count) AS p25,
      PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY review_count) AS median,
      PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY review_count) AS p75,
      PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY review_count) AS p90,
      AVG(review_count)::double precision AS mean,
      AVG(rating)::double precision AS rating_mean,
      PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY rating) AS rating_median,
      COUNT(CASE WHEN business_quality_score IS NOT NULL AND business_quality_score != -1 THEN 1 END)::bigint AS scored_count,
      AVG(CASE WHEN business_quality_score IS NOT NULL AND business_quality_score != -1 THEN business_quality_score END)::double precision AS avg_quality,
      AVG(CASE WHEN sell_likelihood_score IS NOT NULL AND sell_likelihood_score != -1 THEN sell_likelihood_score END)::double precision AS avg_sell
    FROM leads
    WHERE location_state_id IS NOT NULL
      AND review_count IS NOT NULL
      AND rating IS NOT NULL
    GROUP BY location_state_id
    HAVING COUNT(*) >= 5
  `;

  for (const row of byState) {
    await db.marketStatsByState.upsert({
      where: { locationStateId: row.location_state_id },
      create: {
        locationStateId: row.location_state_id,
        leadCount: Number(row.lead_count),
        reviewCountP25: row.p25,
        reviewCountMedian: row.median,
        reviewCountP75: row.p75,
        reviewCountP90: row.p90,
        reviewCountMean: row.mean,
        ratingMean: row.rating_mean,
        ratingMedian: row.rating_median,
        scoredLeadCount: Number(row.scored_count),
        avgQualityScore: row.avg_quality,
        avgSellLikelihood: row.avg_sell,
        refreshedAt: now,
      },
      update: {
        leadCount: Number(row.lead_count),
        reviewCountP25: row.p25,
        reviewCountMedian: row.median,
        reviewCountP75: row.p75,
        reviewCountP90: row.p90,
        reviewCountMean: row.mean,
        ratingMean: row.rating_mean,
        ratingMedian: row.rating_median,
        scoredLeadCount: Number(row.scored_count),
        avgQualityScore: row.avg_quality,
        avgSellLikelihood: row.avg_sell,
        refreshedAt: now,
      },
    });
  }

  // --- By city ---
  const byCity = await db.$queryRaw<Array<{
    location_state_id: string;
    location_city_id: number;
    lead_count: bigint;
    p25: number;
    median: number;
    p75: number;
    p90: number;
    mean: number;
    rating_mean: number;
    rating_median: number;
    scored_count: bigint;
    avg_quality: number | null;
    avg_sell: number | null;
  }>>`
    SELECT
      location_state_id,
      location_city_id,
      COUNT(*)::bigint AS lead_count,
      PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY review_count) AS p25,
      PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY review_count) AS median,
      PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY review_count) AS p75,
      PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY review_count) AS p90,
      AVG(review_count)::double precision AS mean,
      AVG(rating)::double precision AS rating_mean,
      PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY rating) AS rating_median,
      COUNT(CASE WHEN business_quality_score IS NOT NULL AND business_quality_score != -1 THEN 1 END)::bigint AS scored_count,
      AVG(CASE WHEN business_quality_score IS NOT NULL AND business_quality_score != -1 THEN business_quality_score END)::double precision AS avg_quality,
      AVG(CASE WHEN sell_likelihood_score IS NOT NULL AND sell_likelihood_score != -1 THEN sell_likelihood_score END)::double precision AS avg_sell
    FROM leads
    WHERE location_state_id IS NOT NULL
      AND location_city_id IS NOT NULL
      AND review_count IS NOT NULL
      AND rating IS NOT NULL
    GROUP BY location_state_id, location_city_id
    HAVING COUNT(*) >= 5
  `;

  for (const row of byCity) {
    await db.marketStatsByCity.upsert({
      where: {
        locationStateId_locationCityId: {
          locationStateId: row.location_state_id,
          locationCityId: row.location_city_id,
        },
      },
      create: {
        locationStateId: row.location_state_id,
        locationCityId: row.location_city_id,
        leadCount: Number(row.lead_count),
        reviewCountP25: row.p25,
        reviewCountMedian: row.median,
        reviewCountP75: row.p75,
        reviewCountP90: row.p90,
        reviewCountMean: row.mean,
        ratingMean: row.rating_mean,
        ratingMedian: row.rating_median,
        scoredLeadCount: Number(row.scored_count),
        avgQualityScore: row.avg_quality,
        avgSellLikelihood: row.avg_sell,
        refreshedAt: now,
      },
      update: {
        leadCount: Number(row.lead_count),
        reviewCountP25: row.p25,
        reviewCountMedian: row.median,
        reviewCountP75: row.p75,
        reviewCountP90: row.p90,
        reviewCountMean: row.mean,
        ratingMean: row.rating_mean,
        ratingMedian: row.rating_median,
        scoredLeadCount: Number(row.scored_count),
        avgQualityScore: row.avg_quality,
        avgSellLikelihood: row.avg_sell,
        refreshedAt: now,
      },
    });
  }

  // --- Overall ---
  const overall = await db.$queryRaw<Array<{
    lead_count: bigint;
    p25: number;
    median: number;
    p75: number;
    p90: number;
    mean: number;
    rating_mean: number;
    rating_median: number;
    scored_count: bigint;
    avg_quality: number | null;
    avg_sell: number | null;
  }>>`
    SELECT
      COUNT(*)::bigint AS lead_count,
      PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY review_count) AS p25,
      PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY review_count) AS median,
      PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY review_count) AS p75,
      PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY review_count) AS p90,
      AVG(review_count)::double precision AS mean,
      AVG(rating)::double precision AS rating_mean,
      PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY rating) AS rating_median,
      COUNT(CASE WHEN business_quality_score IS NOT NULL AND business_quality_score != -1 THEN 1 END)::bigint AS scored_count,
      AVG(CASE WHEN business_quality_score IS NOT NULL AND business_quality_score != -1 THEN business_quality_score END)::double precision AS avg_quality,
      AVG(CASE WHEN sell_likelihood_score IS NOT NULL AND sell_likelihood_score != -1 THEN sell_likelihood_score END)::double precision AS avg_sell
    FROM leads
    WHERE review_count IS NOT NULL
      AND rating IS NOT NULL
  `;

  if (overall.length > 0 && Number(overall[0].lead_count) >= 5) {
    const row = overall[0];
    await db.marketStatsOverall.upsert({
      where: { id: 'global' },
      create: {
        leadCount: Number(row.lead_count),
        reviewCountP25: row.p25,
        reviewCountMedian: row.median,
        reviewCountP75: row.p75,
        reviewCountP90: row.p90,
        reviewCountMean: row.mean,
        ratingMean: row.rating_mean,
        ratingMedian: row.rating_median,
        scoredLeadCount: Number(row.scored_count),
        avgQualityScore: row.avg_quality,
        avgSellLikelihood: row.avg_sell,
        refreshedAt: now,
      },
      update: {
        leadCount: Number(row.lead_count),
        reviewCountP25: row.p25,
        reviewCountMedian: row.median,
        reviewCountP75: row.p75,
        reviewCountP90: row.p90,
        reviewCountMean: row.mean,
        ratingMean: row.rating_mean,
        ratingMedian: row.rating_median,
        scoredLeadCount: Number(row.scored_count),
        avgQualityScore: row.avg_quality,
        avgSellLikelihood: row.avg_sell,
        refreshedAt: now,
      },
    });
  }

  console.log(`Market stats refreshed: ${byType.length} business types, ${byState.length} states, ${byCity.length} cities, overall`);
}

function percentileBucket(value: number, stats: MarketStats): string {
  if (value >= stats.reviewCountP90) return '90th+ percentile (top tier)';
  if (value >= stats.reviewCountP75) return '75th-90th percentile (above average)';
  if (value >= stats.reviewCountMedian) return '50th-75th percentile (above median)';
  if (value >= stats.reviewCountP25) return '25th-50th percentile (below median)';
  return 'below 25th percentile (bottom quartile)';
}

async function buildMarketContext(
  db: PrismaClient,
  businessType: string | null,
  locationStateId: string | null,
  locationCityId: number | null,
  reviewCount: number | null,
  rating: number | null,
): Promise<string> {
  const sections: string[] = [];

  if (businessType) {
    const typeStats = await db.marketStatsByType.findUnique({
      where: { businessType },
    });
    if (typeStats) {
      let section = `Among ${typeStats.leadCount} "${businessType}" businesses in our database:\n`;
      section += `- Review count: median ${Math.round(typeStats.reviewCountMedian)}, 75th pctl ${Math.round(typeStats.reviewCountP75)}, 90th pctl ${Math.round(typeStats.reviewCountP90)}\n`;
      if (reviewCount !== null) {
        section += `- This lead's ${reviewCount} reviews = ${percentileBucket(reviewCount, typeStats)} for this trade\n`;
      }
      section += `- Rating: median ${typeStats.ratingMedian.toFixed(1)}`;
      if (rating !== null) {
        section += ` — this lead's ${rating.toFixed(1)} = ${rating >= typeStats.ratingMedian ? 'above' : 'below'} median`;
      }
      sections.push(section);
    }
  }

  if (locationStateId) {
    const stateStats = await db.marketStatsByState.findUnique({
      where: { locationStateId },
    });
    if (stateStats) {
      let section = `Among ${stateStats.leadCount} leads in this state:\n`;
      section += `- Review count: median ${Math.round(stateStats.reviewCountMedian)}, 75th pctl ${Math.round(stateStats.reviewCountP75)}, 90th pctl ${Math.round(stateStats.reviewCountP90)}\n`;
      if (reviewCount !== null) {
        section += `- This lead's ${reviewCount} reviews = ${percentileBucket(reviewCount, stateStats)} for this state\n`;
      }
      section += `- Rating: median ${stateStats.ratingMedian.toFixed(1)}`;
      if (rating !== null) {
        section += ` — this lead's ${rating.toFixed(1)} = ${rating >= stateStats.ratingMedian ? 'above' : 'below'} median`;
      }
      sections.push(section);
    }
  }

  if (locationStateId && locationCityId !== null) {
    const cityStats = await db.marketStatsByCity.findFirst({
      where: { locationStateId, locationCityId },
    });
    if (cityStats) {
      let section = `Among ${cityStats.leadCount} leads in this city/metro:\n`;
      section += `- Review count: median ${Math.round(cityStats.reviewCountMedian)}, 75th pctl ${Math.round(cityStats.reviewCountP75)}\n`;
      if (reviewCount !== null) {
        section += `- This lead's ${reviewCount} reviews = ${percentileBucket(reviewCount, cityStats)} for this market`;
      }
      sections.push(section);
    }
  }

  const overallStats = await db.marketStatsOverall.findUnique({
    where: { id: 'global' },
  });
  if (overallStats) {
    let section = `Across all ${overallStats.leadCount} leads in our database:\n`;
    section += `- Review count: median ${Math.round(overallStats.reviewCountMedian)}, 75th pctl ${Math.round(overallStats.reviewCountP75)}, 90th pctl ${Math.round(overallStats.reviewCountP90)}\n`;
    if (reviewCount !== null) {
      section += `- This lead's ${reviewCount} reviews = ${percentileBucket(reviewCount, overallStats)} overall\n`;
    }
    section += `- Rating: median ${overallStats.ratingMedian.toFixed(1)}`;
    if (rating !== null) {
      section += ` — this lead's ${rating.toFixed(1)} = ${rating >= overallStats.ratingMedian ? 'above' : 'below'} median`;
    }
    sections.push(section);
  }

  if (sections.length === 0) return '';
  return '## Market Context\n\n' + sections.join('\n\n');
}

async function scoreLead(leadData: Record<string, unknown>, markdown: string | null, marketContext: string): Promise<ScoringResult> {
  const backoffMs = [5000, 15000, 45000];

  let content = SCORING_PROMPT;
  if (marketContext) {
    content += `\n\n${marketContext}\n\n`;
  }
  content += '## Lead Data\n\n' + JSON.stringify(leadData, null, 2);
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
  "supporting_evidence": [{"url": "<source page url>", "snippet": "<exact verbatim quote>"}, ...]
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
            max_tokens: 1024,
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
          supporting_evidence: [],
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

      const marketContext = await buildMarketContext(
        db,
        lead.businessType,
        lead.locationStateId,
        lead.locationCityId,
        lead.reviewCount,
        lead.rating,
      );

      await db.lead.update({ where: { id: lead_id }, data: { pipelineStatus: 'scoring' } });
      const result = await scoreLead(leadData, markdown, marketContext);
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
