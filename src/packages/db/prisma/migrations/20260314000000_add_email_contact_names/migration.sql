-- AlterTable
ALTER TABLE "lead_emails" ADD COLUMN "first_name" TEXT,
ADD COLUMN "last_name" TEXT,
ADD COLUMN "contact_type" TEXT;

-- AlterEnum
ALTER TYPE "FargateTaskType" ADD VALUE 'contact_extraction';
