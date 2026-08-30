-- CreateEnum
CREATE TYPE "LifecycleStage" AS ENUM ('LEAD', 'CUSTOMER', 'INACTIVE', 'LOST');

-- CreateEnum
CREATE TYPE "CustomerSource" AS ENUM ('MANUAL', 'IMPORT', 'WHATSAPP', 'INSTAGRAM', 'OTHER');

-- CreateEnum
CREATE TYPE "IdentityType" AS ENUM ('PHONE', 'EMAIL', 'WHATSAPP', 'INSTAGRAM', 'EXTERNAL_ID');

-- CreateEnum
CREATE TYPE "CustomerEventType" AS ENUM ('CUSTOMER_CREATED', 'CUSTOMER_UPDATED', 'LEAD_CREATED', 'MESSAGE_SENT', 'MESSAGE_RECEIVED', 'QUOTE_REQUESTED', 'QUOTE_SENT', 'PURCHASE', 'PAYMENT', 'DEBT_CREATED', 'DEBT_PAYMENT', 'FOLLOW_UP', 'FOLLOW_UP_COMPLETED', 'FOLLOW_UP_SKIPPED', 'CUSTOMER_REACTIVATED', 'CUSTOMER_LOST');

-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "source" "CustomerSource" NOT NULL DEFAULT 'MANUAL',
    "lifecycle_stage" "LifecycleStage" NOT NULL DEFAULT 'CUSTOMER',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "total_spend" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "purchase_count" INTEGER NOT NULL DEFAULT 0,
    "last_purchase_at" TIMESTAMP(3),
    "last_contacted_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_identities" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "type" "IdentityType" NOT NULL,
    "value" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_events" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "type" "CustomerEventType" NOT NULL,
    "title" TEXT NOT NULL,
    "payload" JSONB,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customers_business_id_deleted_at_name_idx" ON "customers"("business_id", "deleted_at", "name");

-- CreateIndex
CREATE INDEX "customers_business_id_deleted_at_created_at_idx" ON "customers"("business_id", "deleted_at", "created_at");

-- CreateIndex
CREATE INDEX "customer_identities_customer_id_idx" ON "customer_identities"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "customer_identities_business_id_type_value_key" ON "customer_identities"("business_id", "type", "value");

-- CreateIndex
CREATE INDEX "customer_events_business_id_customer_id_occurred_at_idx" ON "customer_events"("business_id", "customer_id", "occurred_at" DESC);

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_identities" ADD CONSTRAINT "customer_identities_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_events" ADD CONSTRAINT "customer_events_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
