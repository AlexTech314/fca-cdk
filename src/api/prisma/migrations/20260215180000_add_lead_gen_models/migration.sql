-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "place_id" TEXT NOT NULL,
    "campaign_id" TEXT,
    "campaign_run_id" TEXT,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip_code" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "rating" DOUBLE PRECISION,
    "review_count" INTEGER,
    "price_level" INTEGER,
    "business_type" TEXT,
    "source" TEXT,
    "qualification_score" INTEGER,
    "qualification_notes" TEXT,
    "qualified_at" TIMESTAMP(3),
    "web_scraped_at" TIMESTAMP(3),
    "web_scraped_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "queries_s3_key" TEXT,
    "queries_count" INTEGER NOT NULL DEFAULT 0,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_runs" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "started_by_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "queries_total" INTEGER NOT NULL DEFAULT 0,
    "queries_executed" INTEGER NOT NULL DEFAULT 0,
    "leads_found" INTEGER NOT NULL DEFAULT 0,
    "duplicates_skipped" INTEGER NOT NULL DEFAULT 0,
    "errors" INTEGER NOT NULL DEFAULT 0,
    "error_messages" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "campaign_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "leads_place_id_key" ON "leads"("place_id");

-- CreateIndex
CREATE INDEX "leads_campaign_id_idx" ON "leads"("campaign_id");

-- CreateIndex
CREATE INDEX "leads_campaign_run_id_idx" ON "leads"("campaign_run_id");

-- CreateIndex
CREATE INDEX "leads_business_type_idx" ON "leads"("business_type");

-- CreateIndex
CREATE INDEX "leads_state_idx" ON "leads"("state");

-- CreateIndex
CREATE INDEX "leads_qualification_score_idx" ON "leads"("qualification_score");

-- CreateIndex
CREATE INDEX "leads_created_at_idx" ON "leads"("created_at");

-- CreateIndex
CREATE INDEX "campaigns_created_at_idx" ON "campaigns"("created_at");

-- CreateIndex
CREATE INDEX "campaign_runs_campaign_id_idx" ON "campaign_runs"("campaign_id");

-- CreateIndex
CREATE INDEX "campaign_runs_status_idx" ON "campaign_runs"("status");

-- CreateIndex
CREATE INDEX "campaign_runs_started_at_idx" ON "campaign_runs"("started_at");

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_campaign_run_id_fkey" FOREIGN KEY ("campaign_run_id") REFERENCES "campaign_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_runs" ADD CONSTRAINT "campaign_runs_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
