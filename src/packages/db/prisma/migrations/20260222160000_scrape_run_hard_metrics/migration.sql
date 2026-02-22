-- Replace ScrapeRun.metrics JSON with hard columns
ALTER TABLE "scrape_runs" ADD COLUMN "pages_count" INTEGER;
ALTER TABLE "scrape_runs" ADD COLUMN "duration_ms" INTEGER;
ALTER TABLE "scrape_runs" DROP COLUMN IF EXISTS "metrics";
