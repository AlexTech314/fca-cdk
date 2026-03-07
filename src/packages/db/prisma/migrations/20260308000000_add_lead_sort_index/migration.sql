-- AlterTable
ALTER TABLE "leads" ADD COLUMN "sort_index" DOUBLE PRECISION;

-- Backfill: use epoch-microseconds from created_at for well-spaced values
UPDATE "leads" SET "sort_index" = EXTRACT(EPOCH FROM "created_at") * 1000000;

-- CreateIndex
CREATE INDEX "leads_sort_index_idx" ON "leads"("sort_index");
