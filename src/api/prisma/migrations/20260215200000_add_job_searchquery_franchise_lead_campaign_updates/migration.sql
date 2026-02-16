-- CreateTable
CREATE TABLE "search_queries" (
    "id" TEXT NOT NULL,
    "text_query" TEXT NOT NULL,
    "included_type" TEXT,
    "campaign_id" TEXT NOT NULL,
    "campaign_run_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_queries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "franchises" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "display_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "franchises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT,
    "campaign_run_id" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "external_id" TEXT,
    "error_message" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "franchises_name_key" ON "franchises"("name");

-- CreateIndex
CREATE INDEX "search_queries_campaign_id_idx" ON "search_queries"("campaign_id");

-- CreateIndex
CREATE INDEX "search_queries_campaign_run_id_idx" ON "search_queries"("campaign_run_id");

-- CreateIndex
CREATE INDEX "search_queries_text_query_idx" ON "search_queries"("text_query");

-- CreateIndex
CREATE INDEX "jobs_campaign_id_idx" ON "jobs"("campaign_id");

-- CreateIndex
CREATE INDEX "jobs_campaign_run_id_idx" ON "jobs"("campaign_run_id");

-- CreateIndex
CREATE INDEX "jobs_type_idx" ON "jobs"("type");

-- CreateIndex
CREATE INDEX "jobs_status_idx" ON "jobs"("status");

-- CreateIndex
CREATE INDEX "jobs_created_at_idx" ON "jobs"("created_at");

-- AlterTable: campaigns - add max_results_per_search, skip_cached_searches
ALTER TABLE "campaigns" ADD COLUMN "max_results_per_search" INTEGER NOT NULL DEFAULT 60;
ALTER TABLE "campaigns" ADD COLUMN "skip_cached_searches" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: leads - add new columns
ALTER TABLE "leads" ADD COLUMN "search_query_id" TEXT;
ALTER TABLE "leads" ADD COLUMN "franchise_id" TEXT;
ALTER TABLE "leads" ADD COLUMN "name_normalized" TEXT;
ALTER TABLE "leads" ADD COLUMN "business_status" TEXT;
ALTER TABLE "leads" ADD COLUMN "latitude" DOUBLE PRECISION;
ALTER TABLE "leads" ADD COLUMN "longitude" DOUBLE PRECISION;
ALTER TABLE "leads" ADD COLUMN "primary_type" TEXT;
ALTER TABLE "leads" ADD COLUMN "opening_hours" TEXT;
ALTER TABLE "leads" ADD COLUMN "editorial_summary" TEXT;
ALTER TABLE "leads" ADD COLUMN "review_summary" TEXT;
ALTER TABLE "leads" ADD COLUMN "google_maps_uri" TEXT;

-- CreateIndex
CREATE INDEX "leads_search_query_id_idx" ON "leads"("search_query_id");
CREATE INDEX "leads_franchise_id_idx" ON "leads"("franchise_id");
CREATE INDEX "leads_name_normalized_idx" ON "leads"("name_normalized");
CREATE INDEX "leads_business_status_idx" ON "leads"("business_status");

-- AddForeignKey
ALTER TABLE "search_queries" ADD CONSTRAINT "search_queries_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "search_queries" ADD CONSTRAINT "search_queries_campaign_run_id_fkey" FOREIGN KEY ("campaign_run_id") REFERENCES "campaign_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_campaign_run_id_fkey" FOREIGN KEY ("campaign_run_id") REFERENCES "campaign_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_search_query_id_fkey" FOREIGN KEY ("search_query_id") REFERENCES "search_queries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "leads" ADD CONSTRAINT "leads_franchise_id_fkey" FOREIGN KEY ("franchise_id") REFERENCES "franchises"("id") ON DELETE SET NULL ON UPDATE CASCADE;
