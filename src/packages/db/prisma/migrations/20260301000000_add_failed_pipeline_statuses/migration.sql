-- Add failed pipeline statuses and error fields
ALTER TYPE "LeadPipelineStatus" ADD VALUE IF NOT EXISTS 'scrape_failed';
ALTER TYPE "LeadPipelineStatus" ADD VALUE IF NOT EXISTS 'scoring_failed';

ALTER TABLE "leads" ADD COLUMN "scrape_error" TEXT;
ALTER TABLE "leads" ADD COLUMN "scoring_error" TEXT;
