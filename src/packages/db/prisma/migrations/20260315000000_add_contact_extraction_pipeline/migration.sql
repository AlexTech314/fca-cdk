-- Add contact extraction pipeline statuses
ALTER TYPE "LeadPipelineStatus" ADD VALUE 'queued_for_contact_extraction' AFTER 'deep_scraping';
ALTER TYPE "LeadPipelineStatus" ADD VALUE 'extracting_contacts' AFTER 'queued_for_contact_extraction';
ALTER TYPE "LeadPipelineStatus" ADD VALUE 'contact_extraction_failed' AFTER 'extracting_contacts';

-- Add enable_contact_extraction to campaigns
ALTER TABLE "campaigns" ADD COLUMN "enable_contact_extraction" BOOLEAN NOT NULL DEFAULT false;
