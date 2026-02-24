-- Add isExecutive flag to lead_team_members
ALTER TABLE "lead_team_members" ADD COLUMN "is_executive" BOOLEAN NOT NULL DEFAULT false;

-- Create lead_snippets table
CREATE TABLE "lead_snippets" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "source_page_id" TEXT NOT NULL,
    "source_run_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_snippets_pkey" PRIMARY KEY ("id")
);

-- Indexes for lead_snippets
CREATE INDEX "lead_snippets_lead_id_idx" ON "lead_snippets"("lead_id");
CREATE INDEX "lead_snippets_lead_id_category_idx" ON "lead_snippets"("lead_id", "category");
CREATE INDEX "lead_snippets_source_page_id_idx" ON "lead_snippets"("source_page_id");
CREATE INDEX "lead_snippets_source_run_id_idx" ON "lead_snippets"("source_run_id");

-- Foreign keys for lead_snippets
ALTER TABLE "lead_snippets" ADD CONSTRAINT "lead_snippets_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lead_snippets" ADD CONSTRAINT "lead_snippets_source_page_id_fkey" FOREIGN KEY ("source_page_id") REFERENCES "scraped_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
