-- AlterTable
ALTER TABLE "leads" ADD COLUMN "quality_percentile_by_type" DOUBLE PRECISION;
ALTER TABLE "leads" ADD COLUMN "quality_percentile_by_city" DOUBLE PRECISION;
ALTER TABLE "leads" ADD COLUMN "sell_percentile_by_type" DOUBLE PRECISION;
ALTER TABLE "leads" ADD COLUMN "sell_percentile_by_city" DOUBLE PRECISION;
ALTER TABLE "leads" ADD COLUMN "composite_score" DOUBLE PRECISION;

-- CreateIndex
CREATE INDEX "leads_composite_score_idx" ON "leads"("composite_score");
