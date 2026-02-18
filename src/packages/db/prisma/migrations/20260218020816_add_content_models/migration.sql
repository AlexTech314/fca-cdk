/*
  Warnings:

  - A unique constraint covering the columns `[cognito_sub]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "cognito_sub" TEXT,
ADD COLUMN     "last_active_at" TIMESTAMP(3),
ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'readonly';

-- CreateTable
CREATE TABLE "tombstones" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "asset_id" TEXT,
    "industry" TEXT,
    "role" TEXT,
    "buyer_pe_firm" TEXT,
    "buyer_platform" TEXT,
    "transaction_year" INTEGER,
    "city" TEXT,
    "state" TEXT,
    "press_release_id" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_published" BOOLEAN NOT NULL DEFAULT true,
    "preview_token" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tombstones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_posts" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT,
    "content" TEXT NOT NULL,
    "author" TEXT,
    "category" TEXT,
    "published_at" TIMESTAMP(3),
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "preview_token" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_tags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tombstone_tags" (
    "tombstone_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,

    CONSTRAINT "tombstone_tags_pkey" PRIMARY KEY ("tombstone_id","tag_id")
);

-- CreateTable
CREATE TABLE "blog_post_tags" (
    "blog_post_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,

    CONSTRAINT "blog_post_tags_pkey" PRIMARY KEY ("blog_post_id","tag_id")
);

-- CreateTable
CREATE TABLE "page_content" (
    "id" TEXT NOT NULL,
    "page_key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "metadata" JSONB,
    "preview_token" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "page_content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "page_views" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "hour" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "page_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_subscribers" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "source" TEXT,
    "is_subscribed" BOOLEAN NOT NULL DEFAULT true,
    "subscribed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unsubscribed_at" TIMESTAMP(3),

    CONSTRAINT "email_subscribers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seller_intakes" (
    "id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "company_name" TEXT NOT NULL,
    "title" TEXT,
    "industry" TEXT,
    "city" TEXT,
    "state" TEXT,
    "revenue_range" TEXT,
    "employee_count" TEXT,
    "timeline" TEXT,
    "service_interest" TEXT,
    "message" TEXT,
    "source" TEXT,
    "referral_source" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "notes" TEXT,
    "assigned_to" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seller_intakes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_notifications" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "reference_id" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recipient_count" INTEGER NOT NULL,

    CONSTRAINT "email_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_members" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "image" TEXT,
    "bio" TEXT NOT NULL,
    "email" TEXT,
    "linkedin" TEXT,
    "category" TEXT NOT NULL DEFAULT 'leadership',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_published" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_services" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_published" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faqs" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_published" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "faqs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core_values" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_published" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "core_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "industry_sectors" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_published" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "industry_sectors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_offerings" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'service',
    "step" INTEGER,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_published" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_offerings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_config" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "name" TEXT NOT NULL,
    "tagline" TEXT,
    "url" TEXT NOT NULL,
    "description" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "linkedin" TEXT,
    "og_image" TEXT,
    "locations" JSONB NOT NULL DEFAULT '[]',
    "navItems" JSONB NOT NULL DEFAULT '[]',
    "footerNav" JSONB NOT NULL DEFAULT '{}',
    "service_types" JSONB NOT NULL DEFAULT '[]',
    "company_blurb" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "awards" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_published" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "awards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "s3_key" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "file_size" INTEGER,
    "category" TEXT NOT NULL DEFAULT 'file',
    "title" TEXT,
    "description" TEXT,
    "uploaded_by" TEXT,
    "is_published" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tombstones_slug_key" ON "tombstones"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tombstones_press_release_id_key" ON "tombstones"("press_release_id");

-- CreateIndex
CREATE UNIQUE INDEX "tombstones_preview_token_key" ON "tombstones"("preview_token");

-- CreateIndex
CREATE INDEX "tombstones_transaction_year_idx" ON "tombstones"("transaction_year");

-- CreateIndex
CREATE INDEX "tombstones_industry_idx" ON "tombstones"("industry");

-- CreateIndex
CREATE INDEX "tombstones_state_idx" ON "tombstones"("state");

-- CreateIndex
CREATE UNIQUE INDEX "blog_posts_slug_key" ON "blog_posts"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "blog_posts_preview_token_key" ON "blog_posts"("preview_token");

-- CreateIndex
CREATE INDEX "blog_posts_category_is_published_idx" ON "blog_posts"("category", "is_published");

-- CreateIndex
CREATE UNIQUE INDEX "content_tags_name_key" ON "content_tags"("name");

-- CreateIndex
CREATE UNIQUE INDEX "content_tags_slug_key" ON "content_tags"("slug");

-- CreateIndex
CREATE INDEX "tombstone_tags_tag_id_idx" ON "tombstone_tags"("tag_id");

-- CreateIndex
CREATE INDEX "blog_post_tags_tag_id_idx" ON "blog_post_tags"("tag_id");

-- CreateIndex
CREATE UNIQUE INDEX "page_content_page_key_key" ON "page_content"("page_key");

-- CreateIndex
CREATE UNIQUE INDEX "page_content_preview_token_key" ON "page_content"("preview_token");

-- CreateIndex
CREATE INDEX "page_views_hour_idx" ON "page_views"("hour");

-- CreateIndex
CREATE UNIQUE INDEX "page_views_path_hour_key" ON "page_views"("path", "hour");

-- CreateIndex
CREATE UNIQUE INDEX "email_subscribers_email_key" ON "email_subscribers"("email");

-- CreateIndex
CREATE INDEX "seller_intakes_status_idx" ON "seller_intakes"("status");

-- CreateIndex
CREATE INDEX "seller_intakes_created_at_idx" ON "seller_intakes"("created_at");

-- CreateIndex
CREATE INDEX "team_members_category_sort_order_idx" ON "team_members"("category", "sort_order");

-- CreateIndex
CREATE INDEX "service_offerings_category_type_sort_order_idx" ON "service_offerings"("category", "type", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "assets_s3_key_key" ON "assets"("s3_key");

-- CreateIndex
CREATE INDEX "assets_category_idx" ON "assets"("category");

-- CreateIndex
CREATE UNIQUE INDEX "users_cognito_sub_key" ON "users"("cognito_sub");

-- AddForeignKey
ALTER TABLE "tombstones" ADD CONSTRAINT "tombstones_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tombstones" ADD CONSTRAINT "tombstones_press_release_id_fkey" FOREIGN KEY ("press_release_id") REFERENCES "blog_posts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tombstone_tags" ADD CONSTRAINT "tombstone_tags_tombstone_id_fkey" FOREIGN KEY ("tombstone_id") REFERENCES "tombstones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tombstone_tags" ADD CONSTRAINT "tombstone_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "content_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_post_tags" ADD CONSTRAINT "blog_post_tags_blog_post_id_fkey" FOREIGN KEY ("blog_post_id") REFERENCES "blog_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_post_tags" ADD CONSTRAINT "blog_post_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "content_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
