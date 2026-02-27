-- DropTable: lead_snippets
DROP TABLE IF EXISTS "lead_snippets";

-- DropTable: lead_acquisition_signals
DROP TABLE IF EXISTS "lead_acquisition_signals";

-- DropTable: lead_team_members
DROP TABLE IF EXISTS "lead_team_members";

-- DropIndex
DROP INDEX IF EXISTS "leads_founded_year_idx";
DROP INDEX IF EXISTS "leads_has_acquisition_signal_idx";

-- AlterTable: remove dead extraction scalar fields from leads
ALTER TABLE "leads" DROP COLUMN IF EXISTS "founded_year";
ALTER TABLE "leads" DROP COLUMN IF EXISTS "years_in_business";
ALTER TABLE "leads" DROP COLUMN IF EXISTS "headcount_estimate";
ALTER TABLE "leads" DROP COLUMN IF EXISTS "has_acquisition_signal";
ALTER TABLE "leads" DROP COLUMN IF EXISTS "acquisition_summary";
