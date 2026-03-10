-- Add deep scrape pipeline statuses for two-phase scrape architecture
ALTER TYPE "LeadPipelineStatus" ADD VALUE 'queued_for_deep_scrape';
ALTER TYPE "LeadPipelineStatus" ADD VALUE 'deep_scraping';
