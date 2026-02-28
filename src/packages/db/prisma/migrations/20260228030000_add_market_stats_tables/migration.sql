-- CreateTable
CREATE TABLE "market_stats_by_type" (
    "business_type" TEXT NOT NULL,
    "lead_count" INTEGER NOT NULL,
    "review_count_p25" DOUBLE PRECISION NOT NULL,
    "review_count_median" DOUBLE PRECISION NOT NULL,
    "review_count_p75" DOUBLE PRECISION NOT NULL,
    "review_count_p90" DOUBLE PRECISION NOT NULL,
    "review_count_mean" DOUBLE PRECISION NOT NULL,
    "rating_mean" DOUBLE PRECISION NOT NULL,
    "rating_median" DOUBLE PRECISION NOT NULL,
    "scored_lead_count" INTEGER NOT NULL DEFAULT 0,
    "avg_quality_score" DOUBLE PRECISION,
    "avg_sell_likelihood" DOUBLE PRECISION,
    "refreshed_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "market_stats_by_type_pkey" PRIMARY KEY ("business_type")
);

-- CreateTable
CREATE TABLE "market_stats_by_state" (
    "location_state_id" TEXT NOT NULL,
    "lead_count" INTEGER NOT NULL,
    "review_count_p25" DOUBLE PRECISION NOT NULL,
    "review_count_median" DOUBLE PRECISION NOT NULL,
    "review_count_p75" DOUBLE PRECISION NOT NULL,
    "review_count_p90" DOUBLE PRECISION NOT NULL,
    "review_count_mean" DOUBLE PRECISION NOT NULL,
    "rating_mean" DOUBLE PRECISION NOT NULL,
    "rating_median" DOUBLE PRECISION NOT NULL,
    "scored_lead_count" INTEGER NOT NULL DEFAULT 0,
    "avg_quality_score" DOUBLE PRECISION,
    "avg_sell_likelihood" DOUBLE PRECISION,
    "refreshed_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "market_stats_by_state_pkey" PRIMARY KEY ("location_state_id")
);

-- CreateTable
CREATE TABLE "market_stats_by_city" (
    "id" TEXT NOT NULL,
    "location_state_id" TEXT NOT NULL,
    "location_city_id" INTEGER NOT NULL,
    "lead_count" INTEGER NOT NULL,
    "review_count_p25" DOUBLE PRECISION NOT NULL,
    "review_count_median" DOUBLE PRECISION NOT NULL,
    "review_count_p75" DOUBLE PRECISION NOT NULL,
    "review_count_p90" DOUBLE PRECISION NOT NULL,
    "review_count_mean" DOUBLE PRECISION NOT NULL,
    "rating_mean" DOUBLE PRECISION NOT NULL,
    "rating_median" DOUBLE PRECISION NOT NULL,
    "scored_lead_count" INTEGER NOT NULL DEFAULT 0,
    "avg_quality_score" DOUBLE PRECISION,
    "avg_sell_likelihood" DOUBLE PRECISION,
    "refreshed_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "market_stats_by_city_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_stats_overall" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "lead_count" INTEGER NOT NULL,
    "review_count_p25" DOUBLE PRECISION NOT NULL,
    "review_count_median" DOUBLE PRECISION NOT NULL,
    "review_count_p75" DOUBLE PRECISION NOT NULL,
    "review_count_p90" DOUBLE PRECISION NOT NULL,
    "review_count_mean" DOUBLE PRECISION NOT NULL,
    "rating_mean" DOUBLE PRECISION NOT NULL,
    "rating_median" DOUBLE PRECISION NOT NULL,
    "scored_lead_count" INTEGER NOT NULL DEFAULT 0,
    "avg_quality_score" DOUBLE PRECISION,
    "avg_sell_likelihood" DOUBLE PRECISION,
    "refreshed_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "market_stats_overall_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "market_stats_by_city_location_state_id_location_city_id_key" ON "market_stats_by_city"("location_state_id", "location_city_id");

-- CreateIndex
CREATE INDEX "market_stats_by_city_location_state_id_idx" ON "market_stats_by_city"("location_state_id");
