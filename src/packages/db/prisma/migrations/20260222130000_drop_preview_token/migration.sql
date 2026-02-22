-- DropPreviewToken
ALTER TABLE "tombstones" DROP COLUMN IF EXISTS "preview_token";
ALTER TABLE "blog_posts" DROP COLUMN IF EXISTS "preview_token";
ALTER TABLE "page_content" DROP COLUMN IF EXISTS "preview_token";
