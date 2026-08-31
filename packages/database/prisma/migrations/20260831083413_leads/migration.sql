-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'INTERESTED', 'QUOTED', 'NEGOTIATING', 'WON', 'LOST');

-- AlterEnum
ALTER TYPE "CustomerEventType" ADD VALUE 'LEAD_STATUS_CHANGED';

-- CreateTable
CREATE TABLE "leads" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "product_id" UUID,
    "description" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "source" "CustomerSource" NOT NULL DEFAULT 'MANUAL',
    "estimated_value" DECIMAL(14,2),
    "notes" TEXT,
    "last_activity_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "leads_business_id_status_last_activity_at_idx" ON "leads"("business_id", "status", "last_activity_at" DESC);

-- CreateIndex
CREATE INDEX "leads_business_id_customer_id_idx" ON "leads"("business_id", "customer_id");

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
