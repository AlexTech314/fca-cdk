-- Drop priority_score and priority_tier columns and their indexes
DROP INDEX IF EXISTS "leads_priority_score_idx";
DROP INDEX IF EXISTS "leads_priority_tier_idx";
ALTER TABLE "leads" DROP COLUMN IF EXISTS "priority_score", DROP COLUMN IF EXISTS "priority_tier";
