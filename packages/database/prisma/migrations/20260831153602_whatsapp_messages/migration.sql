-- CreateEnum
CREATE TYPE "MessageAction" AS ENUM ('WHATSAPP_OPENED', 'COPIED');

-- CreateTable
CREATE TABLE "messages" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "recommendation_id" UUID,
    "sent_by_id" UUID,
    "channel" "CommunicationChannel" NOT NULL DEFAULT 'WHATSAPP',
    "action" "MessageAction" NOT NULL,
    "body" TEXT NOT NULL,
    "to_phone" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "messages_business_id_customer_id_created_at_idx" ON "messages"("business_id", "customer_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "messages_business_id_created_at_idx" ON "messages"("business_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_recommendation_id_fkey" FOREIGN KEY ("recommendation_id") REFERENCES "daily_recommendations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
