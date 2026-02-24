CREATE TYPE "UserRole" AS ENUM ('readonly', 'readwrite', 'admin');
CREATE TYPE "ScrapeRunStatus" AS ENUM ('running', 'completed', 'failed');
CREATE TYPE "CampaignRunStatus" AS ENUM ('pending', 'running', 'completed', 'failed');
CREATE TYPE "LeadSource" AS ENUM ('google_places', 'manual', 'import');
CREATE TYPE "BlogPostCategory" AS ENUM ('news', 'resource', 'article');

ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "UserRole" USING "role"::text::"UserRole";
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'readonly'::"UserRole";

ALTER TABLE "scrape_runs" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "scrape_runs" ALTER COLUMN "status" TYPE "ScrapeRunStatus" USING "status"::text::"ScrapeRunStatus";
ALTER TABLE "scrape_runs" ALTER COLUMN "status" SET DEFAULT 'running'::"ScrapeRunStatus";

ALTER TABLE "campaign_runs" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "campaign_runs" ALTER COLUMN "status" TYPE "CampaignRunStatus" USING "status"::text::"CampaignRunStatus";
ALTER TABLE "campaign_runs" ALTER COLUMN "status" SET DEFAULT 'pending'::"CampaignRunStatus";

ALTER TABLE "leads" ALTER COLUMN "source" TYPE "LeadSource" USING "source"::text::"LeadSource";

ALTER TABLE "blog_posts" ALTER COLUMN "category" TYPE "BlogPostCategory" USING "category"::text::"BlogPostCategory";
