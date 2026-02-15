-- ============================================================
-- PostgreSQL aws_lambda Extension Triggers
-- ============================================================
-- These triggers invoke a Bridge Lambda when leads are inserted or updated.
-- REQUIRES: aws_lambda and aws_commons extensions (RDS only).
-- For local dev, these triggers will be skipped (extensions not available).
-- ============================================================

-- Install extensions (no-op if already installed, fails gracefully on non-RDS)
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS aws_lambda CASCADE;
  CREATE EXTENSION IF NOT EXISTS aws_commons CASCADE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'aws_lambda extension not available (expected in local dev). Triggers will not be created.';
END;
$$;

-- ============================================================
-- Trigger 1: New leads -> Bridge Lambda -> Scrape Queue
-- ============================================================
-- The Lambda ARN is stored as a helper composite type.
-- IMPORTANT: Replace REGION and ACCOUNT with actual values before deploying.
-- In CDK, this migration is run after the Bridge Lambda is deployed,
-- and the ARN is injected via environment variable or custom resource.
-- ============================================================

DO $$
BEGIN
  -- Only create triggers if aws_lambda extension is available
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'aws_lambda') THEN

    CREATE OR REPLACE FUNCTION notify_new_lead() RETURNS trigger AS $fn$
    BEGIN
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
        'Event'  -- async invocation (non-blocking)
      );
      RETURN NEW;
    EXCEPTION
      WHEN OTHERS THEN
        -- Don't block INSERT if Lambda invocation fails
        RAISE WARNING 'notify_new_lead trigger failed: %', SQLERRM;
        RETURN NEW;
    END;
    $fn$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trg_new_lead ON leads;
    CREATE TRIGGER trg_new_lead
      AFTER INSERT ON leads
      FOR EACH ROW
      EXECUTE FUNCTION notify_new_lead();

    -- ============================================================
    -- Trigger 2: Lead scraped -> Bridge Lambda -> Scoring Queue
    -- ============================================================

    CREATE OR REPLACE FUNCTION notify_lead_scraped() RETURNS trigger AS $fn$
    BEGIN
      IF NEW.web_scraped_at IS NOT NULL AND (OLD.web_scraped_at IS NULL) THEN
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

    DROP TRIGGER IF EXISTS trg_lead_scraped ON leads;
    CREATE TRIGGER trg_lead_scraped
      AFTER UPDATE ON leads
      FOR EACH ROW
      EXECUTE FUNCTION notify_lead_scraped();

    RAISE NOTICE 'aws_lambda triggers created successfully';

  ELSE
    RAISE NOTICE 'aws_lambda extension not available - skipping trigger creation';
  END IF;
END;
$$;
