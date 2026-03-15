-- CreateTable: lead_contacts
CREATE TABLE "lead_contacts" (
    "id" TEXT NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "linkedin" TEXT,
    "instagram" TEXT,
    "facebook" TEXT,
    "twitter" TEXT,
    "is_best_contact" BOOLEAN,
    "scraped_page_id" TEXT,
    "lead_id" TEXT NOT NULL,
    "campaign_id" TEXT,
    "search_query_id" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes
CREATE INDEX "lead_contacts_lead_id_idx" ON "lead_contacts"("lead_id");
CREATE INDEX "lead_contacts_scraped_page_id_idx" ON "lead_contacts"("scraped_page_id");
CREATE INDEX "lead_contacts_campaign_id_idx" ON "lead_contacts"("campaign_id");
CREATE INDEX "lead_contacts_search_query_id_idx" ON "lead_contacts"("search_query_id");

-- AddForeignKeys
ALTER TABLE "lead_contacts" ADD CONSTRAINT "lead_contacts_scraped_page_id_fkey" FOREIGN KEY ("scraped_page_id") REFERENCES "scraped_pages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "lead_contacts" ADD CONSTRAINT "lead_contacts_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lead_contacts" ADD CONSTRAINT "lead_contacts_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "lead_contacts" ADD CONSTRAINT "lead_contacts_search_query_id_fkey" FOREIGN KEY ("search_query_id") REFERENCES "search_queries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Migrate data: emails -> contacts
INSERT INTO "lead_contacts" ("id", "first_name", "last_name", "email", "scraped_page_id", "lead_id", "created_at")
SELECT
    gen_random_uuid()::text,
    "first_name",
    "last_name",
    "value",
    "source_page_id",
    "lead_id",
    "created_at"
FROM "lead_emails";

-- Migrate data: phones -> contacts
INSERT INTO "lead_contacts" ("id", "phone", "scraped_page_id", "lead_id", "created_at")
SELECT
    gen_random_uuid()::text,
    "value",
    "source_page_id",
    "lead_id",
    "created_at"
FROM "lead_phones";

-- Migrate data: social profiles -> contacts (one row per platform)
INSERT INTO "lead_contacts" ("id", "linkedin", "scraped_page_id", "lead_id", "created_at")
SELECT gen_random_uuid()::text, "url", "source_page_id", "lead_id", "created_at"
FROM "lead_social_profiles" WHERE "platform" = 'linkedin';

INSERT INTO "lead_contacts" ("id", "facebook", "scraped_page_id", "lead_id", "created_at")
SELECT gen_random_uuid()::text, "url", "source_page_id", "lead_id", "created_at"
FROM "lead_social_profiles" WHERE "platform" = 'facebook';

INSERT INTO "lead_contacts" ("id", "instagram", "scraped_page_id", "lead_id", "created_at")
SELECT gen_random_uuid()::text, "url", "source_page_id", "lead_id", "created_at"
FROM "lead_social_profiles" WHERE "platform" = 'instagram';

INSERT INTO "lead_contacts" ("id", "twitter", "scraped_page_id", "lead_id", "created_at")
SELECT gen_random_uuid()::text, "url", "source_page_id", "lead_id", "created_at"
FROM "lead_social_profiles" WHERE "platform" = 'twitter';

-- Mark best contacts: match leads.owner_email to an existing contact
UPDATE "lead_contacts" lc
SET "is_best_contact" = true
FROM "leads" l
WHERE lc."lead_id" = l."id"
  AND lc."email" IS NOT NULL
  AND lower(lc."email") = lower(l."owner_email")
  AND l."owner_email" IS NOT NULL;

-- Create best-contact rows for leads where owner_email has no matching contact
INSERT INTO "lead_contacts" ("id", "email", "phone", "linkedin", "is_best_contact", "lead_id", "created_at")
SELECT
    gen_random_uuid()::text,
    l."owner_email",
    l."owner_phone",
    l."owner_linkedin",
    true,
    l."id",
    NOW()
FROM "leads" l
WHERE l."owner_email" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "lead_contacts" lc
    WHERE lc."lead_id" = l."id" AND lc."is_best_contact" = true
  );

-- Drop old tables
DROP TABLE "lead_social_profiles";
DROP TABLE "lead_phones";
DROP TABLE "lead_emails";

-- Drop old columns from leads
ALTER TABLE "leads" DROP COLUMN "owner_email";
ALTER TABLE "leads" DROP COLUMN "owner_phone";
ALTER TABLE "leads" DROP COLUMN "owner_linkedin";
ALTER TABLE "leads" DROP COLUMN "contact_confidence";
