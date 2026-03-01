-- Add S3 key for persisted extraction results
ALTER TABLE "leads" ADD COLUMN "extracted_facts_s3_key" TEXT;
