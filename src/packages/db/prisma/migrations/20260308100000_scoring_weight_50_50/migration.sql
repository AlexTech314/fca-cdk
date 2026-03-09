-- Reweight composite_score from 60/40 (BQ/ER) to 50/50
-- For IB deal sourcing, exit readiness matters as much as business quality.

UPDATE leads SET
  composite_score = CASE
    WHEN business_quality_score IS NOT NULL AND business_quality_score != -1
     AND exit_readiness_score IS NOT NULL AND exit_readiness_score != -1
    THEN (business_quality_score * 0.5 + exit_readiness_score * 0.5)
    ELSE NULL
  END,
  tier = CASE
    WHEN business_quality_score IS NULL OR business_quality_score = -1
      OR exit_readiness_score IS NULL OR exit_readiness_score = -1 THEN NULL
    WHEN business_quality_score >= 700 AND exit_readiness_score >= 700 THEN 1
    WHEN (business_quality_score * 0.5 + exit_readiness_score * 0.5) >= 700.0 THEN 1
    WHEN (business_quality_score * 0.5 + exit_readiness_score * 0.5) >= 500.0 THEN 2
    ELSE 3
  END
WHERE is_excluded = false
  AND business_quality_score IS NOT NULL AND business_quality_score != -1
  AND exit_readiness_score IS NOT NULL AND exit_readiness_score != -1;

-- Excluded leads get composite_score=0 and no tier
UPDATE leads SET composite_score = 0, tier = NULL
WHERE is_excluded = true;
