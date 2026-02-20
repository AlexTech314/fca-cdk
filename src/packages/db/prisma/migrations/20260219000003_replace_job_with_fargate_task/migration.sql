-- Replace Job model with FargateTask
-- Create enum types and new table, drop jobs table

CREATE TYPE "FargateTaskType" AS ENUM ('places_search', 'web_scrape', 'ai_scoring');
CREATE TYPE "FargateTaskStatus" AS ENUM ('pending', 'running', 'completed', 'failed', 'cancelled');

CREATE TABLE "fargate_tasks" (
    "id" TEXT NOT NULL,
    "type" "FargateTaskType" NOT NULL,
    "status" "FargateTaskStatus" NOT NULL DEFAULT 'pending',
    "task_arn" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "error_message" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fargate_tasks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "fargate_tasks_type_idx" ON "fargate_tasks"("type");
CREATE INDEX "fargate_tasks_status_idx" ON "fargate_tasks"("status");
CREATE INDEX "fargate_tasks_created_at_idx" ON "fargate_tasks"("created_at");

-- Migrate existing jobs data where type maps to FargateTaskType
INSERT INTO "fargate_tasks" ("id", "type", "status", "task_arn", "started_at", "completed_at", "error_message", "metadata", "created_at", "updated_at")
SELECT
    "id",
    CASE "type"
        WHEN 'places_search' THEN 'places_search'::"FargateTaskType"
        WHEN 'web_scrape' THEN 'web_scrape'::"FargateTaskType"
        WHEN 'score_leads' THEN 'ai_scoring'::"FargateTaskType"
        WHEN 'prepare_scrape' THEN 'web_scrape'::"FargateTaskType"
        ELSE 'web_scrape'::"FargateTaskType"
    END,
    CASE "status"
        WHEN 'pending' THEN 'pending'::"FargateTaskStatus"
        WHEN 'running' THEN 'running'::"FargateTaskStatus"
        WHEN 'completed' THEN 'completed'::"FargateTaskStatus"
        WHEN 'failed' THEN 'failed'::"FargateTaskStatus"
        ELSE 'pending'::"FargateTaskStatus"
    END,
    "external_id",
    "started_at",
    "completed_at",
    "error_message",
    "metadata",
    "created_at",
    "updated_at"
FROM "jobs";

DROP TABLE "jobs";
