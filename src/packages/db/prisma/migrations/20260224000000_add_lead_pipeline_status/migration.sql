-- CreateEnum
CREATE TYPE "LeadPipelineStatus" AS ENUM ('idle', 'queued_for_scrape', 'scraping', 'queued_for_scoring', 'queued_for_batch_scoring', 'scoring');

-- AlterTable
ALTER TABLE "leads" ADD COLUMN "pipeline_status" "LeadPipelineStatus" NOT NULL DEFAULT 'idle';

-- CreateIndex
CREATE INDEX "leads_pipeline_status_idx" ON "leads"("pipeline_status");
