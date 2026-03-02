-- Rename sell_likelihood columns to exit_readiness (metadata-only, no table rewrite)
ALTER TABLE "leads" RENAME COLUMN "sell_likelihood_score" TO "exit_readiness_score";
ALTER TABLE "leads" RENAME COLUMN "sell_percentile_by_type" TO "exit_percentile_by_type";
ALTER TABLE "leads" RENAME COLUMN "sell_percentile_by_city" TO "exit_percentile_by_city";
