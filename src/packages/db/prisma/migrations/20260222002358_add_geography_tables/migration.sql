-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "location_city_id" INTEGER,
ADD COLUMN     "location_state_id" TEXT;

-- CreateTable
CREATE TABLE "states" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cities" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "state_id" TEXT NOT NULL,
    "county" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "population" INTEGER,

    CONSTRAINT "cities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tombstone_cities" (
    "tombstone_id" TEXT NOT NULL,
    "city_id" INTEGER NOT NULL,

    CONSTRAINT "tombstone_cities_pkey" PRIMARY KEY ("tombstone_id","city_id")
);

-- CreateTable
CREATE TABLE "tombstone_states" (
    "tombstone_id" TEXT NOT NULL,
    "state_id" TEXT NOT NULL,

    CONSTRAINT "tombstone_states_pkey" PRIMARY KEY ("tombstone_id","state_id")
);

-- CreateTable
CREATE TABLE "blog_post_cities" (
    "blog_post_id" TEXT NOT NULL,
    "city_id" INTEGER NOT NULL,

    CONSTRAINT "blog_post_cities_pkey" PRIMARY KEY ("blog_post_id","city_id")
);

-- CreateTable
CREATE TABLE "blog_post_states" (
    "blog_post_id" TEXT NOT NULL,
    "state_id" TEXT NOT NULL,

    CONSTRAINT "blog_post_states_pkey" PRIMARY KEY ("blog_post_id","state_id")
);

-- CreateTable
CREATE TABLE "campaign_cities" (
    "campaign_id" TEXT NOT NULL,
    "city_id" INTEGER NOT NULL,

    CONSTRAINT "campaign_cities_pkey" PRIMARY KEY ("campaign_id","city_id")
);

-- CreateTable
CREATE TABLE "campaign_states" (
    "campaign_id" TEXT NOT NULL,
    "state_id" TEXT NOT NULL,

    CONSTRAINT "campaign_states_pkey" PRIMARY KEY ("campaign_id","state_id")
);

-- CreateTable
CREATE TABLE "franchise_cities" (
    "franchise_id" TEXT NOT NULL,
    "city_id" INTEGER NOT NULL,

    CONSTRAINT "franchise_cities_pkey" PRIMARY KEY ("franchise_id","city_id")
);

-- CreateTable
CREATE TABLE "franchise_states" (
    "franchise_id" TEXT NOT NULL,
    "state_id" TEXT NOT NULL,

    CONSTRAINT "franchise_states_pkey" PRIMARY KEY ("franchise_id","state_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "states_name_key" ON "states"("name");

-- CreateIndex
CREATE INDEX "cities_state_id_idx" ON "cities"("state_id");

-- CreateIndex
CREATE INDEX "cities_name_idx" ON "cities"("name");

-- CreateIndex
CREATE INDEX "cities_population_idx" ON "cities"("population" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "cities_name_state_id_key" ON "cities"("name", "state_id");

-- CreateIndex
CREATE INDEX "tombstone_cities_city_id_idx" ON "tombstone_cities"("city_id");

-- CreateIndex
CREATE INDEX "tombstone_states_state_id_idx" ON "tombstone_states"("state_id");

-- CreateIndex
CREATE INDEX "blog_post_cities_city_id_idx" ON "blog_post_cities"("city_id");

-- CreateIndex
CREATE INDEX "blog_post_states_state_id_idx" ON "blog_post_states"("state_id");

-- CreateIndex
CREATE INDEX "campaign_cities_city_id_idx" ON "campaign_cities"("city_id");

-- CreateIndex
CREATE INDEX "campaign_states_state_id_idx" ON "campaign_states"("state_id");

-- CreateIndex
CREATE INDEX "franchise_cities_city_id_idx" ON "franchise_cities"("city_id");

-- CreateIndex
CREATE INDEX "franchise_states_state_id_idx" ON "franchise_states"("state_id");

-- CreateIndex
CREATE INDEX "leads_location_city_id_idx" ON "leads"("location_city_id");

-- CreateIndex
CREATE INDEX "leads_location_state_id_idx" ON "leads"("location_state_id");

-- AddForeignKey
ALTER TABLE "cities" ADD CONSTRAINT "cities_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "states"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tombstone_cities" ADD CONSTRAINT "tombstone_cities_tombstone_id_fkey" FOREIGN KEY ("tombstone_id") REFERENCES "tombstones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tombstone_cities" ADD CONSTRAINT "tombstone_cities_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tombstone_states" ADD CONSTRAINT "tombstone_states_tombstone_id_fkey" FOREIGN KEY ("tombstone_id") REFERENCES "tombstones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tombstone_states" ADD CONSTRAINT "tombstone_states_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "states"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_post_cities" ADD CONSTRAINT "blog_post_cities_blog_post_id_fkey" FOREIGN KEY ("blog_post_id") REFERENCES "blog_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_post_cities" ADD CONSTRAINT "blog_post_cities_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_post_states" ADD CONSTRAINT "blog_post_states_blog_post_id_fkey" FOREIGN KEY ("blog_post_id") REFERENCES "blog_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_post_states" ADD CONSTRAINT "blog_post_states_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "states"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_cities" ADD CONSTRAINT "campaign_cities_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_cities" ADD CONSTRAINT "campaign_cities_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_states" ADD CONSTRAINT "campaign_states_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_states" ADD CONSTRAINT "campaign_states_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "states"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "franchise_cities" ADD CONSTRAINT "franchise_cities_franchise_id_fkey" FOREIGN KEY ("franchise_id") REFERENCES "franchises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "franchise_cities" ADD CONSTRAINT "franchise_cities_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "franchise_states" ADD CONSTRAINT "franchise_states_franchise_id_fkey" FOREIGN KEY ("franchise_id") REFERENCES "franchises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "franchise_states" ADD CONSTRAINT "franchise_states_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "states"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_location_city_id_fkey" FOREIGN KEY ("location_city_id") REFERENCES "cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_location_state_id_fkey" FOREIGN KEY ("location_state_id") REFERENCES "states"("id") ON DELETE SET NULL ON UPDATE CASCADE;
