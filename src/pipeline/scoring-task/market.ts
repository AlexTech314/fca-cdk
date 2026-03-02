import type { PrismaClient } from '@prisma/client';

import type { MarketStats } from './types.js';
import { RC_PERCENTILES, RC_KEYS } from './types.js';

export async function refreshMarketStats(db: PrismaClient): Promise<void> {
  console.log('Refreshing market stats materialized views...');
  await db.$executeRaw`REFRESH MATERIALIZED VIEW CONCURRENTLY market_stats_by_type`;
  await db.$executeRaw`REFRESH MATERIALIZED VIEW CONCURRENTLY market_stats_by_state`;
  await db.$executeRaw`REFRESH MATERIALIZED VIEW CONCURRENTLY market_stats_by_city`;
  console.log('Market stats refreshed');
}

export async function refreshLeadRanks(db: PrismaClient): Promise<void> {
  console.log('Refreshing lead percentile ranks...');
  // Uses temp tables to avoid repeated full-table scans of leads.
  // Composite weight = cohort_size * Shannon entropy (normalized 0-1).
  // Zero entropy (all identical scores) → weight 0 (percentile rank is meaningless).
  // Max entropy (uniform across 1-10) → weight = cohort_size (rank is maximally informative).
  const result = await db.$transaction(async (tx) => {
    // Step 1: Materialize scored leads into a compact temp table (single scan of leads)
    await tx.$executeRaw`
      CREATE TEMP TABLE _scored ON COMMIT DROP AS
      SELECT id, business_type, location_city_id, location_state_id,
             business_quality_score, exit_readiness_score
      FROM leads
      WHERE business_quality_score IS NOT NULL AND business_quality_score != -1
        AND exit_readiness_score IS NOT NULL AND exit_readiness_score != -1
        AND is_excluded = false`;
    await tx.$executeRaw`CREATE INDEX ON _scored (business_type)`;
    await tx.$executeRaw`CREATE INDEX ON _scored (location_city_id, location_state_id)`;

    // Step 2: Compute entropy-weighted cohort weights by business type
    await tx.$executeRaw`
      CREATE TEMP TABLE _type_weights ON COMMIT DROP AS
      WITH q_freq AS (
        SELECT business_type, business_quality_score,
               COUNT(*)::float / SUM(COUNT(*)) OVER (PARTITION BY business_type) AS p
        FROM _scored WHERE business_type IS NOT NULL
        GROUP BY business_type, business_quality_score
      ),
      q_ent AS (
        SELECT business_type,
          CASE WHEN COUNT(*) <= 1 THEN 0 ELSE -SUM(p * LN(p)) / LN(10) END AS h
        FROM q_freq GROUP BY business_type
      ),
      s_freq AS (
        SELECT business_type, exit_readiness_score,
               COUNT(*)::float / SUM(COUNT(*)) OVER (PARTITION BY business_type) AS p
        FROM _scored WHERE business_type IS NOT NULL
        GROUP BY business_type, exit_readiness_score
      ),
      s_ent AS (
        SELECT business_type,
          CASE WHEN COUNT(*) <= 1 THEN 0 ELSE -SUM(p * LN(p)) / LN(10) END AS h
        FROM s_freq GROUP BY business_type
      )
      SELECT tc.business_type, tc.cnt,
             tc.cnt * COALESCE(q.h, 0) AS q_w,
             tc.cnt * COALESCE(s.h, 0) AS s_w
      FROM (SELECT business_type, COUNT(*) AS cnt FROM _scored WHERE business_type IS NOT NULL GROUP BY business_type) tc
      LEFT JOIN q_ent q ON q.business_type = tc.business_type
      LEFT JOIN s_ent s ON s.business_type = tc.business_type`;

    // Step 3: Compute entropy-weighted cohort weights by city
    await tx.$executeRaw`
      CREATE TEMP TABLE _city_weights ON COMMIT DROP AS
      WITH q_freq AS (
        SELECT location_city_id, location_state_id, business_quality_score,
               COUNT(*)::float / SUM(COUNT(*)) OVER (PARTITION BY location_city_id, location_state_id) AS p
        FROM _scored WHERE location_city_id IS NOT NULL
        GROUP BY location_city_id, location_state_id, business_quality_score
      ),
      q_ent AS (
        SELECT location_city_id, location_state_id,
          CASE WHEN COUNT(*) <= 1 THEN 0 ELSE -SUM(p * LN(p)) / LN(10) END AS h
        FROM q_freq GROUP BY location_city_id, location_state_id
      ),
      s_freq AS (
        SELECT location_city_id, location_state_id, exit_readiness_score,
               COUNT(*)::float / SUM(COUNT(*)) OVER (PARTITION BY location_city_id, location_state_id) AS p
        FROM _scored WHERE location_city_id IS NOT NULL
        GROUP BY location_city_id, location_state_id, exit_readiness_score
      ),
      s_ent AS (
        SELECT location_city_id, location_state_id,
          CASE WHEN COUNT(*) <= 1 THEN 0 ELSE -SUM(p * LN(p)) / LN(10) END AS h
        FROM s_freq GROUP BY location_city_id, location_state_id
      )
      SELECT cc.location_city_id, cc.location_state_id, cc.cnt,
             cc.cnt * COALESCE(q.h, 0) AS q_w,
             cc.cnt * COALESCE(s.h, 0) AS s_w
      FROM (SELECT location_city_id, location_state_id, COUNT(*) AS cnt FROM _scored WHERE location_city_id IS NOT NULL GROUP BY location_city_id, location_state_id) cc
      LEFT JOIN q_ent q ON q.location_city_id = cc.location_city_id AND q.location_state_id = cc.location_state_id
      LEFT JOIN s_ent s ON s.location_city_id = cc.location_city_id AND s.location_state_id = cc.location_state_id`;

    // Step 4: Compute percentile ranks and update leads
    return tx.$executeRaw`
      WITH ranked AS (
        SELECT s.id,
          CASE WHEN tw.cnt >= 5 THEN PERCENT_RANK() OVER (PARTITION BY s.business_type ORDER BY s.business_quality_score) * 100 ELSE NULL END AS q_type,
          CASE WHEN cw.cnt >= 5 THEN PERCENT_RANK() OVER (PARTITION BY s.location_city_id, s.location_state_id ORDER BY s.business_quality_score) * 100 ELSE NULL END AS q_city,
          CASE WHEN tw.cnt >= 5 THEN PERCENT_RANK() OVER (PARTITION BY s.business_type ORDER BY s.exit_readiness_score) * 100 ELSE NULL END AS s_type,
          CASE WHEN cw.cnt >= 5 THEN PERCENT_RANK() OVER (PARTITION BY s.location_city_id, s.location_state_id ORDER BY s.exit_readiness_score) * 100 ELSE NULL END AS s_city,
          COALESCE(tw.q_w, 0) AS q_type_w, COALESCE(cw.q_w, 0) AS q_city_w,
          COALESCE(tw.s_w, 0) AS s_type_w, COALESCE(cw.s_w, 0) AS s_city_w
        FROM _scored s
        LEFT JOIN _type_weights tw ON tw.business_type = s.business_type
        LEFT JOIN _city_weights cw ON cw.location_city_id = s.location_city_id AND cw.location_state_id = s.location_state_id
      )
      UPDATE leads SET
        quality_percentile_by_type = ranked.q_type,
        quality_percentile_by_city = ranked.q_city,
        exit_percentile_by_type = ranked.s_type,
        exit_percentile_by_city = ranked.s_city,
        composite_score = (
          COALESCE(q_type * q_type_w, 0) + COALESCE(q_city * q_city_w, 0) +
          COALESCE(s_type * s_type_w, 0) + COALESCE(s_city * s_city_w, 0)
        ) / NULLIF(
          (CASE WHEN q_type IS NOT NULL THEN q_type_w ELSE 0 END) +
          (CASE WHEN q_city IS NOT NULL THEN q_city_w ELSE 0 END) +
          (CASE WHEN s_type IS NOT NULL THEN s_type_w ELSE 0 END) +
          (CASE WHEN s_city IS NOT NULL THEN s_city_w ELSE 0 END),
          0
        )
      FROM ranked WHERE leads.id = ranked.id`;
  });
  console.log(`Lead percentile ranks refreshed: ${result} rows updated`);
}

export function percentileBucket(value: number, stats: MarketStats): string {
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

export async function buildMarketContext(
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
