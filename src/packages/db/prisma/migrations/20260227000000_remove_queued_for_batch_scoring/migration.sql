-- Reset any leads currently in queued_for_batch_scoring to queued_for_scoring
UPDATE "leads" SET "pipeline_status" = 'queued_for_scoring' WHERE "pipeline_status" = 'queued_for_batch_scoring';

-- Remove the enum value
ALTER TYPE "LeadPipelineStatus" RENAME TO "LeadPipelineStatus_old";
CREATE TYPE "LeadPipelineStatus" AS ENUM ('idle', 'queued_for_scrape', 'scraping', 'queued_for_scoring', 'scoring');
ALTER TABLE "leads" ALTER COLUMN "pipeline_status" DROP DEFAULT;
ALTER TABLE "leads" ALTER COLUMN "pipeline_status" TYPE "LeadPipelineStatus" USING ("pipeline_status"::text::"LeadPipelineStatus");
ALTER TABLE "leads" ALTER COLUMN "pipeline_status" SET DEFAULT 'idle';
DROP TYPE "LeadPipelineStatus_old";
