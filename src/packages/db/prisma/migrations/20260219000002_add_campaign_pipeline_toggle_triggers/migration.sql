-- Update notify_new_lead to check campaign.enable_web_scraping before invoking Bridge Lambda
-- Update notify_lead_scraped to check campaign.enable_ai_scoring before invoking Bridge Lambda
-- Note: aws_lambda extension must be available (RDS only). This migration updates the trigger functions.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'aws_lambda') THEN

    CREATE OR REPLACE FUNCTION notify_new_lead() RETURNS trigger AS $fn$
    DECLARE
      v_enable_scraping boolean;
    BEGIN
      SELECT c.enable_web_scraping INTO v_enable_scraping
      FROM campaigns c WHERE c.id = NEW.campaign_id;

      IF v_enable_scraping IS DISTINCT FROM true THEN
        RETURN NEW;
      END IF;

      PERFORM aws_lambda.invoke(
        aws_commons.create_lambda_function_arn(
          current_setting('app.bridge_lambda_arn', true),
          current_setting('app.aws_region', true)
        ),
        json_build_object(
          'event', 'new_lead',
          'lead_id', NEW.id,
          'place_id', NEW.place_id
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
    BEGIN
      IF NEW.web_scraped_at IS NOT NULL AND (OLD.web_scraped_at IS NULL) THEN
        SELECT c.enable_ai_scoring INTO v_enable_scoring
        FROM campaigns c WHERE c.id = NEW.campaign_id;

        IF v_enable_scoring IS DISTINCT FROM true THEN
          RETURN NEW;
        END IF;

        PERFORM aws_lambda.invoke(
          aws_commons.create_lambda_function_arn(
            current_setting('app.bridge_lambda_arn', true),
            current_setting('app.aws_region', true)
          ),
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

    RAISE NOTICE 'Campaign pipeline toggle triggers updated successfully';

  ELSE
    RAISE NOTICE 'aws_lambda extension not available - skipping trigger updates';
  END IF;
END;
$$;
