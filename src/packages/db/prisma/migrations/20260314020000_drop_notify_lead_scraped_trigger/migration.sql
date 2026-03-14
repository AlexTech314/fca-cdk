-- Drop the notify_lead_scraped trigger and function.
-- Scoring and contact extraction are now enqueued directly by the scrape task,
-- so this PG trigger -> Bridge Lambda path is no longer needed.

DROP TRIGGER IF EXISTS lead_scraped_trigger ON leads;
DROP FUNCTION IF EXISTS notify_lead_scraped();
