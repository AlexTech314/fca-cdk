-- Scrape Provenance Migration (breaking, no backward compatibility)
-- Drops legacy JSON/S3 scrape storage, adds ScrapeRun, normalized extracted tables, Lead scalar fields

-- 1. Drop junction tables that reference scraped_pages
DROP TABLE IF EXISTS "franchise_scraped_pages";
DROP TABLE IF EXISTS "lead_scraped_pages";

-- 2. Truncate scraped_pages (no migration of legacy data)
TRUNCATE TABLE "scraped_pages" CASCADE;

-- 3. Create scrape_runs table
CREATE TABLE "scrape_runs" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "task_id" TEXT,
    "root_url" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "method_summary" TEXT,
    "metrics" JSONB,

    CONSTRAINT "scrape_runs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "scrape_runs_lead_id_started_at_idx" ON "scrape_runs"("lead_id", "started_at");
CREATE INDEX "scrape_runs_status_idx" ON "scrape_runs"("status");
CREATE INDEX "scrape_runs_task_id_idx" ON "scrape_runs"("task_id");

ALTER TABLE "scrape_runs" ADD CONSTRAINT "scrape_runs_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 4. Alter scraped_pages: drop legacy columns, add lineage columns
ALTER TABLE "scraped_pages" DROP COLUMN IF EXISTS "raw_s3_key";
ALTER TABLE "scraped_pages" DROP COLUMN IF EXISTS "extracted_s3_key";
ALTER TABLE "scraped_pages" DROP COLUMN IF EXISTS "extracted_data";

ALTER TABLE "scraped_pages" ADD COLUMN "scrape_run_id" TEXT;
ALTER TABLE "scraped_pages" ADD COLUMN "lead_id" TEXT;
ALTER TABLE "scraped_pages" ADD COLUMN "parent_scraped_page_id" TEXT;
ALTER TABLE "scraped_pages" ADD COLUMN "depth" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "scraped_pages" ADD COLUMN "link_text" TEXT;
ALTER TABLE "scraped_pages" ADD COLUMN "anchor_text" TEXT;
ALTER TABLE "scraped_pages" ADD COLUMN "discovered_from_url" TEXT;

-- 5. Alter leads: drop web_scraped_data, add scalar scrape fields
ALTER TABLE "leads" DROP COLUMN IF EXISTS "web_scraped_data";
ALTER TABLE "leads" ADD COLUMN "founded_year" INTEGER;
ALTER TABLE "leads" ADD COLUMN "years_in_business" INTEGER;
ALTER TABLE "leads" ADD COLUMN "headcount_estimate" INTEGER;
ALTER TABLE "leads" ADD COLUMN "has_acquisition_signal" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "leads" ADD COLUMN "acquisition_summary" TEXT;
ALTER TABLE "leads" ADD COLUMN "contact_page_url" TEXT;

CREATE INDEX "leads_founded_year_idx" ON "leads"("founded_year");
CREATE INDEX "leads_has_acquisition_signal_idx" ON "leads"("has_acquisition_signal");

-- 6. Make scraped_pages new FKs required and add constraints
ALTER TABLE "scraped_pages" ALTER COLUMN "scrape_run_id" SET NOT NULL;
ALTER TABLE "scraped_pages" ALTER COLUMN "lead_id" SET NOT NULL;

ALTER TABLE "scraped_pages" ADD CONSTRAINT "scraped_pages_scrape_run_id_fkey" FOREIGN KEY ("scrape_run_id") REFERENCES "scrape_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "scraped_pages" ADD CONSTRAINT "scraped_pages_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "scraped_pages" ADD CONSTRAINT "scraped_pages_parent_scraped_page_id_fkey" FOREIGN KEY ("parent_scraped_page_id") REFERENCES "scraped_pages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "scraped_pages_scrape_run_id_url_key" ON "scraped_pages"("scrape_run_id", "url");
CREATE INDEX "scraped_pages_parent_scraped_page_id_idx" ON "scraped_pages"("parent_scraped_page_id");
CREATE INDEX "scraped_pages_lead_id_scraped_at_idx" ON "scraped_pages"("lead_id", "scraped_at");

-- 7. Recreate franchise_scraped_pages junction
CREATE TABLE "franchise_scraped_pages" (
    "franchise_id" TEXT NOT NULL,
    "scraped_page_id" TEXT NOT NULL,

    CONSTRAINT "franchise_scraped_pages_pkey" PRIMARY KEY ("franchise_id","scraped_page_id")
);

CREATE INDEX "franchise_scraped_pages_scraped_page_id_idx" ON "franchise_scraped_pages"("scraped_page_id");

ALTER TABLE "franchise_scraped_pages" ADD CONSTRAINT "franchise_scraped_pages_franchise_id_fkey" FOREIGN KEY ("franchise_id") REFERENCES "franchises"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "franchise_scraped_pages" ADD CONSTRAINT "franchise_scraped_pages_scraped_page_id_fkey" FOREIGN KEY ("scraped_page_id") REFERENCES "scraped_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 8. Create normalized extracted tables
CREATE TABLE "lead_emails" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "source_page_id" TEXT NOT NULL,
    "source_run_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_emails_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "lead_emails_lead_id_idx" ON "lead_emails"("lead_id");
CREATE INDEX "lead_emails_source_page_id_idx" ON "lead_emails"("source_page_id");
CREATE INDEX "lead_emails_source_run_id_idx" ON "lead_emails"("source_run_id");

ALTER TABLE "lead_emails" ADD CONSTRAINT "lead_emails_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lead_emails" ADD CONSTRAINT "lead_emails_source_page_id_fkey" FOREIGN KEY ("source_page_id") REFERENCES "scraped_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lead_emails" ADD CONSTRAINT "lead_emails_source_run_id_fkey" FOREIGN KEY ("source_run_id") REFERENCES "scrape_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "lead_phones" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "source_page_id" TEXT NOT NULL,
    "source_run_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_phones_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "lead_phones_lead_id_idx" ON "lead_phones"("lead_id");
CREATE INDEX "lead_phones_source_page_id_idx" ON "lead_phones"("source_page_id");
CREATE INDEX "lead_phones_source_run_id_idx" ON "lead_phones"("source_run_id");

ALTER TABLE "lead_phones" ADD CONSTRAINT "lead_phones_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lead_phones" ADD CONSTRAINT "lead_phones_source_page_id_fkey" FOREIGN KEY ("source_page_id") REFERENCES "scraped_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lead_phones" ADD CONSTRAINT "lead_phones_source_run_id_fkey" FOREIGN KEY ("source_run_id") REFERENCES "scrape_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "lead_social_profiles" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "source_page_id" TEXT NOT NULL,
    "source_run_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_social_profiles_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "lead_social_profiles_lead_id_idx" ON "lead_social_profiles"("lead_id");
CREATE INDEX "lead_social_profiles_source_page_id_idx" ON "lead_social_profiles"("source_page_id");
CREATE INDEX "lead_social_profiles_source_run_id_idx" ON "lead_social_profiles"("source_run_id");

ALTER TABLE "lead_social_profiles" ADD CONSTRAINT "lead_social_profiles_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lead_social_profiles" ADD CONSTRAINT "lead_social_profiles_source_page_id_fkey" FOREIGN KEY ("source_page_id") REFERENCES "scraped_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lead_social_profiles" ADD CONSTRAINT "lead_social_profiles_source_run_id_fkey" FOREIGN KEY ("source_run_id") REFERENCES "scrape_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "lead_team_members" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "source_url" TEXT,
    "source_page_id" TEXT NOT NULL,
    "source_run_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_team_members_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "lead_team_members_lead_id_idx" ON "lead_team_members"("lead_id");
CREATE INDEX "lead_team_members_source_page_id_idx" ON "lead_team_members"("source_page_id");
CREATE INDEX "lead_team_members_source_run_id_idx" ON "lead_team_members"("source_run_id");

ALTER TABLE "lead_team_members" ADD CONSTRAINT "lead_team_members_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lead_team_members" ADD CONSTRAINT "lead_team_members_source_page_id_fkey" FOREIGN KEY ("source_page_id") REFERENCES "scraped_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lead_team_members" ADD CONSTRAINT "lead_team_members_source_run_id_fkey" FOREIGN KEY ("source_run_id") REFERENCES "scrape_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "lead_acquisition_signals" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "signal_type" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "date_mentioned" TEXT,
    "source_page_id" TEXT NOT NULL,
    "source_run_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_acquisition_signals_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "lead_acquisition_signals_lead_id_idx" ON "lead_acquisition_signals"("lead_id");
CREATE INDEX "lead_acquisition_signals_source_page_id_idx" ON "lead_acquisition_signals"("source_page_id");
CREATE INDEX "lead_acquisition_signals_source_run_id_idx" ON "lead_acquisition_signals"("source_run_id");

ALTER TABLE "lead_acquisition_signals" ADD CONSTRAINT "lead_acquisition_signals_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lead_acquisition_signals" ADD CONSTRAINT "lead_acquisition_signals_source_page_id_fkey" FOREIGN KEY ("source_page_id") REFERENCES "scraped_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lead_acquisition_signals" ADD CONSTRAINT "lead_acquisition_signals_source_run_id_fkey" FOREIGN KEY ("source_run_id") REFERENCES "scrape_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
