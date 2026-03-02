-- AlterTable
ALTER TABLE "industry_sectors" ADD COLUMN "industry_id" TEXT;

-- AddForeignKey
ALTER TABLE "industry_sectors" ADD CONSTRAINT "industry_sectors_industry_id_fkey" FOREIGN KEY ("industry_id") REFERENCES "industries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
