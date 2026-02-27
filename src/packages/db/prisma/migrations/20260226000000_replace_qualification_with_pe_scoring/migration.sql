-- Replace old qualification fields with PE scoring fields

-- Add new scoring columns
ALTER TABLE "leads" ADD COLUMN "controlling_owner" TEXT;
ALTER TABLE "leads" ADD COLUMN "ownership_type" TEXT;
ALTER TABLE "leads" ADD COLUMN "is_excluded" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "leads" ADD COLUMN "exclusion_reason" TEXT;
ALTER TABLE "leads" ADD COLUMN "business_quality_score" INTEGER;
ALTER TABLE "leads" ADD COLUMN "sell_likelihood_score" INTEGER;
ALTER TABLE "leads" ADD COLUMN "priority_score" INTEGER;
ALTER TABLE "leads" ADD COLUMN "priority_tier" INTEGER;
ALTER TABLE "leads" ADD COLUMN "scoring_rationale" TEXT;
ALTER TABLE "leads" ADD COLUMN "supporting_urls" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "leads" ADD COLUMN "scrape_markdown_s3_key" TEXT;
ALTER TABLE "leads" ADD COLUMN "scored_at" TIMESTAMP(3);

-- Migrate existing qualification data to new fields
UPDATE "leads"
SET "priority_score" = "qualification_score",
    "scoring_rationale" = "qualification_notes",
    "scored_at" = "qualified_at"
WHERE "qualification_score" IS NOT NULL;

-- Drop old qualification columns
ALTER TABLE "leads" DROP COLUMN "qualification_score";
ALTER TABLE "leads" DROP COLUMN "qualification_notes";
ALTER TABLE "leads" DROP COLUMN "qualified_at";

-- Replace old index with new indexes
CREATE INDEX "leads_priority_score_idx" ON "leads"("priority_score");
CREATE INDEX "leads_priority_tier_idx" ON "leads"("priority_tier");
CREATE INDEX "leads_is_excluded_idx" ON "leads"("is_excluded");
CREATE INDEX "leads_scored_at_idx" ON "leads"("scored_at");
