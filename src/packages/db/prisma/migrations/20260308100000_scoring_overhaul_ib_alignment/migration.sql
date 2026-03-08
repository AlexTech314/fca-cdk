-- Drop old percentile columns
ALTER TABLE "leads" DROP COLUMN IF EXISTS "quality_percentile_by_type";
ALTER TABLE "leads" DROP COLUMN IF EXISTS "quality_percentile_by_city";
ALTER TABLE "leads" DROP COLUMN IF EXISTS "exit_percentile_by_type";
ALTER TABLE "leads" DROP COLUMN IF EXISTS "exit_percentile_by_city";

-- Add new columns
ALTER TABLE "leads" ADD COLUMN "tier" INTEGER;
ALTER TABLE "leads" ADD COLUMN "is_intermediated" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "leads" ADD COLUMN "intermediation_signals" TEXT;
ALTER TABLE "leads" ADD COLUMN "owner_email" TEXT;
ALTER TABLE "leads" ADD COLUMN "owner_phone" TEXT;
ALTER TABLE "leads" ADD COLUMN "owner_linkedin" TEXT;
ALTER TABLE "leads" ADD COLUMN "contact_confidence" TEXT;

-- Add indexes
CREATE INDEX "leads_tier_idx" ON "leads"("tier");
CREATE INDEX "leads_is_intermediated_idx" ON "leads"("is_intermediated");

-- Backfill: scale BQ/ER from 1-10 to 0-1000 (multiply by 100)
UPDATE "leads"
SET business_quality_score = business_quality_score * 100
WHERE business_quality_score IS NOT NULL
  AND business_quality_score != -1
  AND business_quality_score <= 10;

UPDATE "leads"
SET exit_readiness_score = exit_readiness_score * 100
WHERE exit_readiness_score IS NOT NULL
  AND exit_readiness_score != -1
  AND exit_readiness_score <= 10;

-- Recompute composite_score (priority score) and tier
UPDATE "leads"
SET
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
WHERE business_quality_score IS NOT NULL AND business_quality_score != -1
  AND exit_readiness_score IS NOT NULL AND exit_readiness_score != -1
  AND is_excluded = false;
