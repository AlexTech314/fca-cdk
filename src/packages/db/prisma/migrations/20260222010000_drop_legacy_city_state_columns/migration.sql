-- DropIndex
DROP INDEX IF EXISTS "tombstones_state_idx";

-- DropIndex
DROP INDEX IF EXISTS "tombstones_city_idx";

-- DropIndex
DROP INDEX IF EXISTS "leads_state_idx";

-- AlterTable
ALTER TABLE "tombstones" DROP COLUMN IF EXISTS "city",
DROP COLUMN IF EXISTS "state";

-- AlterTable
ALTER TABLE "leads" DROP COLUMN IF EXISTS "city",
DROP COLUMN IF EXISTS "state";
