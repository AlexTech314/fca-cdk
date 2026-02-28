-- Replace supporting_urls (text[]) with supporting_evidence (jsonb)
ALTER TABLE "leads" ADD COLUMN "supporting_evidence" JSONB;
ALTER TABLE "leads" DROP COLUMN IF EXISTS "supporting_urls";
