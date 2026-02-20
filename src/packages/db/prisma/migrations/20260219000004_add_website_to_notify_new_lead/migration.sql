-- Add website to notify_new_lead payload for event-driven scrape pipeline

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

    RAISE NOTICE 'notify_new_lead updated to include website';

  ELSE
    RAISE NOTICE 'aws_lambda extension not available - skipping trigger update';
  END IF;
END;
$$;
