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
  console.log('Refreshing lead priority scores and tiers...');
  const result = await db.$executeRaw`
    UPDATE leads SET
      composite_score = CASE
        WHEN business_quality_score IS NOT NULL AND business_quality_score != -1
         AND exit_readiness_score IS NOT NULL AND exit_readiness_score != -1
        THEN (business_quality_score * 0.6 + exit_readiness_score * 0.4)
        ELSE NULL
      END,
      tier = CASE
        WHEN business_quality_score IS NULL OR business_quality_score = -1
          OR exit_readiness_score IS NULL OR exit_readiness_score = -1 THEN NULL
        WHEN business_quality_score >= 700 AND exit_readiness_score >= 700 THEN 1
        WHEN (business_quality_score * 0.6 + exit_readiness_score * 0.4) >= 700.0 THEN 1
        WHEN (business_quality_score * 0.6 + exit_readiness_score * 0.4) >= 500.0 THEN 2
        ELSE 3
      END
    WHERE is_excluded = false
      AND business_quality_score IS NOT NULL AND business_quality_score != -1
      AND exit_readiness_score IS NOT NULL AND exit_readiness_score != -1`;
  console.log(`Lead priority scores refreshed: ${result} rows updated`);
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
