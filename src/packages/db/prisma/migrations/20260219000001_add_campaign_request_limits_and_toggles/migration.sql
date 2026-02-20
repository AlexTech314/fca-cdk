-- AlterTable
ALTER TABLE "campaigns" ADD COLUMN "max_total_requests" INTEGER,
ADD COLUMN "enable_web_scraping" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "enable_ai_scoring" BOOLEAN NOT NULL DEFAULT false;
