-- Drop existing tables
DROP TABLE IF EXISTS "market_stats_overall";
DROP TABLE IF EXISTS "market_stats_by_city";
DROP TABLE IF EXISTS "market_stats_by_state";
DROP TABLE IF EXISTS "market_stats_by_type";

-- CreateMaterializedView: market_stats_by_type
CREATE MATERIALIZED VIEW "market_stats_by_type" AS
SELECT
  business_type,
  COUNT(*)::integer AS lead_count,
  PERCENTILE_CONT(0.00)  WITHIN GROUP (ORDER BY review_count)::double precision AS rc_p00,
  PERCENTILE_CONT(0.01)  WITHIN GROUP (ORDER BY review_count)::double precision AS rc_p01,
  PERCENTILE_CONT(0.05)  WITHIN GROUP (ORDER BY review_count)::double precision AS rc_p05,
  PERCENTILE_CONT(0.10)  WITHIN GROUP (ORDER BY review_count)::double precision AS rc_p10,
  PERCENTILE_CONT(0.15)  WITHIN GROUP (ORDER BY review_count)::double precision AS rc_p15,
  PERCENTILE_CONT(0.20)  WITHIN GROUP (ORDER BY review_count)::double precision AS rc_p20,
  PERCENTILE_CONT(0.25)  WITHIN GROUP (ORDER BY review_count)::double precision AS rc_p25,
  PERCENTILE_CONT(0.30)  WITHIN GROUP (ORDER BY review_count)::double precision AS rc_p30,
  PERCENTILE_CONT(0.35)  WITHIN GROUP (ORDER BY review_count)::double precision AS rc_p35,
  PERCENTILE_CONT(0.40)  WITHIN GROUP (ORDER BY review_count)::double precision AS rc_p40,
  PERCENTILE_CONT(0.45)  WITHIN GROUP (ORDER BY review_count)::double precision AS rc_p45,
  PERCENTILE_CONT(0.50)  WITHIN GROUP (ORDER BY review_count)::double precision AS rc_p50,
  PERCENTILE_CONT(0.55)  WITHIN GROUP (ORDER BY review_count)::double precision AS rc_p55,
  PERCENTILE_CONT(0.60)  WITHIN GROUP (ORDER BY review_count)::double precision AS rc_p60,
  PERCENTILE_CONT(0.65)  WITHIN GROUP (ORDER BY review_count)::double precision AS rc_p65,
  PERCENTILE_CONT(0.70)  WITHIN GROUP (ORDER BY review_count)::double precision AS rc_p70,
  PERCENTILE_CONT(0.75)  WITHIN GROUP (ORDER BY review_count)::double precision AS rc_p75,
  PERCENTILE_CONT(0.80)  WITHIN GROUP (ORDER BY review_count)::double precision AS rc_p80,
  PERCENTILE_CONT(0.85)  WITHIN GROUP (ORDER BY review_count)::double precision AS rc_p85,
  PERCENTILE_CONT(0.90)  WITHIN GROUP (ORDER BY review_count)::double precision AS rc_p90,
  PERCENTILE_CONT(0.95)  WITHIN GROUP (ORDER BY review_count)::double precision AS rc_p95,
  PERCENTILE_CONT(0.99)  WITHIN GROUP (ORDER BY review_count)::double precision AS rc_p99,
  PERCENTILE_CONT(0.999) WITHIN GROUP (ORDER BY review_count)::double precision AS rc_p999,
  AVG(rating)::double precision AS rating_mean,
  PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY rating)::double precision AS rating_median
FROM leads
WHERE business_type IS NOT NULL
  AND review_count IS NOT NULL
  AND rating IS NOT NULL
GROUP BY business_type
HAVING COUNT(*) >= 5;

CREATE UNIQUE INDEX "market_stats_by_type_business_type_idx"
  ON "market_stats_by_type" ("business_type");

-- CreateMaterializedView: market_stats_by_state
CREATE MATERIALIZED VIEW "market_stats_by_state" AS
SELECT
  location_state_id,
  COUNT(*)::integer AS lead_count,
  PERCENTILE_CONT(0.00)  WITHIN GROUP (ORDER BY review_count)::double precision AS rc_p00,
  PERCENTILE_CONT(0.01)  WITHIN GROUP (ORDER BY review_count)::double precision AS rc_p01,
  PERCENTILE_CONT(0.05)  WITHIN GROUP (ORDER BY review_count)::double precision AS rc_p05,
  PERCENTILE_CONT(0.10)  WITHIN GROUP (ORDER BY review_count)::double precision AS rc_p10,
  PERCENTILE_CONT(0.15)  WITHIN GROUP (ORDER BY review_count)::double precision AS rc_p15,
  PERCENTILE_CONT(0.20)  WITHIN GROUP (ORDER BY review_count)::double precision AS rc_p20,
  PERCENTILE_CONT(0.25)  WITHIN GROUP (ORDER BY review_count)::double precision AS rc_p25,
  PERCENTILE_CONT(0.30)  WITHIN GROUP (ORDER BY review_count)::double precision AS rc_p30,
  PERCENTILE_CONT(0.35)  WITHIN GROUP (ORDER BY review_count)::double precision AS rc_p35,
  PERCENTILE_CONT(0.40)  WITHIN GROUP (ORDER BY review_count)::double precision AS rc_p40,
  PERCENTILE_CONT(0.45)  WITHIN GROUP (ORDER BY review_count)::double precision AS rc_p45,
  PERCENTILE_CONT(0.50)  WITHIN GROUP (ORDER BY review_count)::double precision AS rc_p50,
  PERCENTILE_CONT(0.55)  WITHIN GROUP (ORDER BY review_count)::double precision AS rc_p55,
  PERCENTILE_CONT(0.60)  WITHIN GROUP (ORDER BY review_count)::double precision AS rc_p60,
  PERCENTILE_CONT(0.65)  WITHIN GROUP (ORDER BY review_count)::double precision AS rc_p65,
  PERCENTILE_CONT(0.70)  WITHIN GROUP (ORDER BY review_count)::double precision AS rc_p70,
  PERCENTILE_CONT(0.75)  WITHIN GROUP (ORDER BY review_count)::double precision AS rc_p75,
  PERCENTILE_CONT(0.80)  WITHIN GROUP (ORDER BY review_count)::double precision AS rc_p80,
  PERCENTILE_CONT(0.85)  WITHIN GROUP (ORDER BY review_count)::double precision AS rc_p85,
  PERCENTILE_CONT(0.90)  WITHIN GROUP (ORDER BY review_count)::double precision AS rc_p90,
  PERCENTILE_CONT(0.95)  WITHIN GROUP (ORDER BY review_count)::double precision AS rc_p95,
  PERCENTILE_CONT(0.99)  WITHIN GROUP (ORDER BY review_count)::double precision AS rc_p99,
  PERCENTILE_CONT(0.999) WITHIN GROUP (ORDER BY review_count)::double precision AS rc_p999,
  AVG(rating)::double precision AS rating_mean,
  PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY rating)::double precision AS rating_median
FROM leads
WHERE location_state_id IS NOT NULL
  AND review_count IS NOT NULL
  AND rating IS NOT NULL
GROUP BY location_state_id
HAVING COUNT(*) >= 5;

CREATE UNIQUE INDEX "market_stats_by_state_location_state_id_idx"
  ON "market_stats_by_state" ("location_state_id");

-- CreateMaterializedView: market_stats_by_city
CREATE MATERIALIZED VIEW "market_stats_by_city" AS
SELECT
  location_state_id,
  location_city_id,
  COUNT(*)::integer AS lead_count,
  PERCENTILE_CONT(0.00)  WITHIN GROUP (ORDER BY review_count)::double precision AS rc_p00,
  PERCENTILE_CONT(0.01)  WITHIN GROUP (ORDER BY review_count)::double precision AS rc_p01,
  PERCENTILE_CONT(0.05)  WITHIN GROUP (ORDER BY review_count)::double precision AS rc_p05,
  PERCENTILE_CONT(0.10)  WITHIN GROUP (ORDER BY review_count)::double precision AS rc_p10,
  PERCENTILE_CONT(0.15)  WITHIN GROUP (ORDER BY review_count)::double precision AS rc_p15,
  PERCENTILE_CONT(0.20)  WITHIN GROUP (ORDER BY review_count)::double precision AS rc_p20,
  PERCENTILE_CONT(0.25)  WITHIN GROUP (ORDER BY review_count)::double precision AS rc_p25,
  PERCENTILE_CONT(0.30)  WITHIN GROUP (ORDER BY review_count)::double precision AS rc_p30,
  PERCENTILE_CONT(0.35)  WITHIN GROUP (ORDER BY review_count)::double precision AS rc_p35,
  PERCENTILE_CONT(0.40)  WITHIN GROUP (ORDER BY review_count)::double precision AS rc_p40,
  PERCENTILE_CONT(0.45)  WITHIN GROUP (ORDER BY review_count)::double precision AS rc_p45,
  PERCENTILE_CONT(0.50)  WITHIN GROUP (ORDER BY review_count)::double precision AS rc_p50,
  PERCENTILE_CONT(0.55)  WITHIN GROUP (ORDER BY review_count)::double precision AS rc_p55,
  PERCENTILE_CONT(0.60)  WITHIN GROUP (ORDER BY review_count)::double precision AS rc_p60,
  PERCENTILE_CONT(0.65)  WITHIN GROUP (ORDER BY review_count)::double precision AS rc_p65,
  PERCENTILE_CONT(0.70)  WITHIN GROUP (ORDER BY review_count)::double precision AS rc_p70,
  PERCENTILE_CONT(0.75)  WITHIN GROUP (ORDER BY review_count)::double precision AS rc_p75,
  PERCENTILE_CONT(0.80)  WITHIN GROUP (ORDER BY review_count)::double precision AS rc_p80,
  PERCENTILE_CONT(0.85)  WITHIN GROUP (ORDER BY review_count)::double precision AS rc_p85,
  PERCENTILE_CONT(0.90)  WITHIN GROUP (ORDER BY review_count)::double precision AS rc_p90,
  PERCENTILE_CONT(0.95)  WITHIN GROUP (ORDER BY review_count)::double precision AS rc_p95,
  PERCENTILE_CONT(0.99)  WITHIN GROUP (ORDER BY review_count)::double precision AS rc_p99,
  PERCENTILE_CONT(0.999) WITHIN GROUP (ORDER BY review_count)::double precision AS rc_p999,
  AVG(rating)::double precision AS rating_mean,
  PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY rating)::double precision AS rating_median
FROM leads
WHERE location_state_id IS NOT NULL
  AND location_city_id IS NOT NULL
  AND review_count IS NOT NULL
  AND rating IS NOT NULL
GROUP BY location_state_id, location_city_id
HAVING COUNT(*) >= 5;

CREATE UNIQUE INDEX "market_stats_by_city_state_city_idx"
  ON "market_stats_by_city" ("location_state_id", "location_city_id");
