-- CreateTable
CREATE TABLE "scraped_pages" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "scrape_method" TEXT NOT NULL,
    "status_code" INTEGER,
    "scraped_at" TIMESTAMP(3) NOT NULL,
    "duration_ms" INTEGER,
    "raw_s3_key" TEXT,
    "extracted_s3_key" TEXT,
    "extracted_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scraped_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_scraped_pages" (
    "lead_id" TEXT NOT NULL,
    "scraped_page_id" TEXT NOT NULL,

    CONSTRAINT "lead_scraped_pages_pkey" PRIMARY KEY ("lead_id","scraped_page_id")
);

-- CreateTable
CREATE TABLE "franchise_scraped_pages" (
    "franchise_id" TEXT NOT NULL,
    "scraped_page_id" TEXT NOT NULL,

    CONSTRAINT "franchise_scraped_pages_pkey" PRIMARY KEY ("franchise_id","scraped_page_id")
);

-- CreateIndex
CREATE INDEX "scraped_pages_domain_idx" ON "scraped_pages"("domain");

-- CreateIndex
CREATE INDEX "scraped_pages_scraped_at_idx" ON "scraped_pages"("scraped_at");

-- CreateIndex
CREATE INDEX "lead_scraped_pages_scraped_page_id_idx" ON "lead_scraped_pages"("scraped_page_id");

-- CreateIndex
CREATE INDEX "franchise_scraped_pages_scraped_page_id_idx" ON "franchise_scraped_pages"("scraped_page_id");

-- AddForeignKey
ALTER TABLE "lead_scraped_pages" ADD CONSTRAINT "lead_scraped_pages_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_scraped_pages" ADD CONSTRAINT "lead_scraped_pages_scraped_page_id_fkey" FOREIGN KEY ("scraped_page_id") REFERENCES "scraped_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "franchise_scraped_pages" ADD CONSTRAINT "franchise_scraped_pages_franchise_id_fkey" FOREIGN KEY ("franchise_id") REFERENCES "franchises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "franchise_scraped_pages" ADD CONSTRAINT "franchise_scraped_pages_scraped_page_id_fkey" FOREIGN KEY ("scraped_page_id") REFERENCES "scraped_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
