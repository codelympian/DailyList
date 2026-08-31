-- CreateEnum
CREATE TYPE "RecommendationCategory" AS ENUM ('HOT_LEAD', 'REORDER_DUE', 'DEBTOR', 'LOST_CUSTOMER');

-- CreateEnum
CREATE TYPE "RecommendationStatus" AS ENUM ('PENDING', 'CONTACTED', 'COMPLETED', 'SKIPPED', 'DISMISSED', 'CONVERTED');

-- AlterTable
ALTER TABLE "business_settings" ADD COLUMN     "daily_list_size" INTEGER NOT NULL DEFAULT 20;

-- CreateTable
CREATE TABLE "daily_recommendations" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "recommendation_date" DATE NOT NULL,
    "category" "RecommendationCategory" NOT NULL,
    "score" INTEGER NOT NULL,
    "segments" TEXT[],
    "reason_codes" TEXT[],
    "reason_text" TEXT[],
    "score_breakdown" JSONB,
    "suggested_message" TEXT,
    "status" "RecommendationStatus" NOT NULL DEFAULT 'PENDING',
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "daily_recommendations_business_id_recommendation_date_score_idx" ON "daily_recommendations"("business_id", "recommendation_date", "score" DESC);

-- CreateIndex
CREATE INDEX "daily_recommendations_business_id_recommendation_date_statu_idx" ON "daily_recommendations"("business_id", "recommendation_date", "status");

-- CreateIndex
CREATE UNIQUE INDEX "daily_recommendations_business_id_customer_id_recommendatio_key" ON "daily_recommendations"("business_id", "customer_id", "recommendation_date");

-- AddForeignKey
ALTER TABLE "daily_recommendations" ADD CONSTRAINT "daily_recommendations_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_recommendations" ADD CONSTRAINT "daily_recommendations_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
