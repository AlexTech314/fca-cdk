-- AlterTable
ALTER TABLE "leads" ADD COLUMN "google_types" TEXT[] DEFAULT ARRAY[]::TEXT[];
