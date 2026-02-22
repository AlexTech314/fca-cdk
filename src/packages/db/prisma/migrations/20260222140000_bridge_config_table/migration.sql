-- Replace current_setting GUC approach with a config table for RDS compatibility.
-- RDS rds_superuser cannot ALTER DATABASE/ROLE SET for custom GUC parameters.

CREATE TABLE IF NOT EXISTS _bridge_config (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Update trigger functions to read from _bridge_config instead of current_setting()

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'aws_lambda') THEN

    CREATE OR REPLACE FUNCTION notify_new_lead() RETURNS trigger AS $fn$
    DECLARE
      v_enable_scraping boolean;
      v_lambda_arn text;
      v_region text;
    BEGIN
      SELECT c.enable_web_scraping INTO v_enable_scraping
      FROM campaigns c WHERE c.id = NEW.campaign_id;

      IF v_enable_scraping IS DISTINCT FROM true THEN
        RETURN NEW;
      END IF;

      SELECT value INTO v_lambda_arn FROM _bridge_config WHERE key = 'bridge_lambda_arn';
      SELECT value INTO v_region     FROM _bridge_config WHERE key = 'aws_region';

      IF v_lambda_arn IS NULL OR v_region IS NULL THEN
        RAISE WARNING 'notify_new_lead: bridge config not set (_bridge_config table)';
        RETURN NEW;
      END IF;

      PERFORM aws_lambda.invoke(
        aws_commons.create_lambda_function_arn(v_lambda_arn, v_region),
        json_build_object(
          'event', 'new_lead',
          'lead_id', NEW.id,
          'place_id', NEW.place_id,
          'website', NEW.website
        )::json,
        'Event'
      );
      RETURN NEW;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'notify_new_lead trigger failed: %', SQLERRM;
        RETURN NEW;
    END;
    $fn$ LANGUAGE plpgsql;

    CREATE OR REPLACE FUNCTION notify_lead_scraped() RETURNS trigger AS $fn$
    DECLARE
      v_enable_scoring boolean;
      v_lambda_arn text;
      v_region text;
    BEGIN
      IF NEW.web_scraped_at IS NOT NULL AND (OLD.web_scraped_at IS NULL) THEN
        SELECT c.enable_ai_scoring INTO v_enable_scoring
        FROM campaigns c WHERE c.id = NEW.campaign_id;

        IF v_enable_scoring IS DISTINCT FROM true THEN
          RETURN NEW;
        END IF;

        SELECT value INTO v_lambda_arn FROM _bridge_config WHERE key = 'bridge_lambda_arn';
        SELECT value INTO v_region     FROM _bridge_config WHERE key = 'aws_region';

        IF v_lambda_arn IS NULL OR v_region IS NULL THEN
          RAISE WARNING 'notify_lead_scraped: bridge config not set (_bridge_config table)';
          RETURN NEW;
        END IF;

        PERFORM aws_lambda.invoke(
          aws_commons.create_lambda_function_arn(v_lambda_arn, v_region),
          json_build_object(
            'event', 'lead_scraped',
            'lead_id', NEW.id,
            'place_id', NEW.place_id
          )::json,
          'Event'
        );
      END IF;
      RETURN NEW;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'notify_lead_scraped trigger failed: %', SQLERRM;
        RETURN NEW;
    END;
    $fn$ LANGUAGE plpgsql;

    RAISE NOTICE 'Trigger functions updated to use _bridge_config table';

  ELSE
    RAISE NOTICE 'aws_lambda extension not available - skipping trigger updates';
  END IF;
END;
$$;
