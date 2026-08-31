-- CreateEnum
CREATE TYPE "CommunicationChannel" AS ENUM ('WHATSAPP', 'SMS', 'EMAIL');

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "contact_attempt_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "last_response_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "business_settings" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "vip_lifetime_spend" DECIMAL(14,2) NOT NULL DEFAULT 100000,
    "repeat_customer_min_purchases" INTEGER NOT NULL DEFAULT 2,
    "default_reorder_interval_days" INTEGER NOT NULL DEFAULT 45,
    "reorder_due_percent" INTEGER NOT NULL DEFAULT 90,
    "lost_reorder_multiple" INTEGER NOT NULL DEFAULT 3,
    "lost_customer_days" INTEGER NOT NULL DEFAULT 90,
    "hot_lead_recency_days" INTEGER NOT NULL DEFAULT 14,
    "min_contact_interval_days" INTEGER NOT NULL DEFAULT 7,
    "recent_purchase_suppression_days" INTEGER NOT NULL DEFAULT 3,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communication_preferences" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "channel" "CommunicationChannel" NOT NULL,
    "opted_in" BOOLEAN NOT NULL DEFAULT true,
    "opted_in_at" TIMESTAMP(3),
    "opted_out_at" TIMESTAMP(3),
    "source" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "communication_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "business_settings_business_id_key" ON "business_settings"("business_id");

-- CreateIndex
CREATE INDEX "communication_preferences_business_id_channel_opted_in_idx" ON "communication_preferences"("business_id", "channel", "opted_in");

-- CreateIndex
CREATE UNIQUE INDEX "communication_preferences_customer_id_channel_key" ON "communication_preferences"("customer_id", "channel");

-- AddForeignKey
ALTER TABLE "business_settings" ADD CONSTRAINT "business_settings_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_preferences" ADD CONSTRAINT "communication_preferences_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
