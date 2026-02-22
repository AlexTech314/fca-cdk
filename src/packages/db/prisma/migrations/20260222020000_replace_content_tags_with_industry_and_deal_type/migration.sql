-- Drop old junction tables and ContentTag
DROP TABLE IF EXISTS "tombstone_tags";
DROP TABLE IF EXISTS "blog_post_tags";
DROP TABLE IF EXISTS "content_tags";

-- Drop legacy industry string column from tombstones
ALTER TABLE "tombstones" DROP COLUMN IF EXISTS "industry";

-- Create Industry model
CREATE TABLE "industries" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "industries_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "industries_name_key" ON "industries"("name");
CREATE UNIQUE INDEX "industries_slug_key" ON "industries"("slug");

-- Create DealType model
CREATE TABLE "deal_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "deal_types_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "deal_types_name_key" ON "deal_types"("name");
CREATE UNIQUE INDEX "deal_types_slug_key" ON "deal_types"("slug");

-- Create TombstoneIndustry junction
CREATE TABLE "tombstone_industries" (
    "tombstone_id" TEXT NOT NULL,
    "industry_id" TEXT NOT NULL,
    CONSTRAINT "tombstone_industries_pkey" PRIMARY KEY ("tombstone_id","industry_id")
);
CREATE INDEX "tombstone_industries_industry_id_idx" ON "tombstone_industries"("industry_id");
ALTER TABLE "tombstone_industries" ADD CONSTRAINT "tombstone_industries_tombstone_id_fkey" FOREIGN KEY ("tombstone_id") REFERENCES "tombstones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tombstone_industries" ADD CONSTRAINT "tombstone_industries_industry_id_fkey" FOREIGN KEY ("industry_id") REFERENCES "industries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create TombstoneDealType junction
CREATE TABLE "tombstone_deal_types" (
    "tombstone_id" TEXT NOT NULL,
    "deal_type_id" TEXT NOT NULL,
    CONSTRAINT "tombstone_deal_types_pkey" PRIMARY KEY ("tombstone_id","deal_type_id")
);
CREATE INDEX "tombstone_deal_types_deal_type_id_idx" ON "tombstone_deal_types"("deal_type_id");
ALTER TABLE "tombstone_deal_types" ADD CONSTRAINT "tombstone_deal_types_tombstone_id_fkey" FOREIGN KEY ("tombstone_id") REFERENCES "tombstones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tombstone_deal_types" ADD CONSTRAINT "tombstone_deal_types_deal_type_id_fkey" FOREIGN KEY ("deal_type_id") REFERENCES "deal_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create BlogPostIndustry junction
CREATE TABLE "blog_post_industries" (
    "blog_post_id" TEXT NOT NULL,
    "industry_id" TEXT NOT NULL,
    CONSTRAINT "blog_post_industries_pkey" PRIMARY KEY ("blog_post_id","industry_id")
);
CREATE INDEX "blog_post_industries_industry_id_idx" ON "blog_post_industries"("industry_id");
ALTER TABLE "blog_post_industries" ADD CONSTRAINT "blog_post_industries_blog_post_id_fkey" FOREIGN KEY ("blog_post_id") REFERENCES "blog_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "blog_post_industries" ADD CONSTRAINT "blog_post_industries_industry_id_fkey" FOREIGN KEY ("industry_id") REFERENCES "industries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
