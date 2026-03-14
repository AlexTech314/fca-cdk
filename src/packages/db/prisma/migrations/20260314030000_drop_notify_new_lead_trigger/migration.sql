-- Remove bridge lambda infrastructure from the database.
-- The places task now sends directly to the scrape queue via SQS.

DROP TRIGGER IF EXISTS trg_new_lead ON leads;
DROP FUNCTION IF EXISTS notify_new_lead();
DROP TABLE IF EXISTS _bridge_config;
