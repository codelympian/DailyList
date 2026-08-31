-- CreateEnum
CREATE TYPE "MessageCategory" AS ENUM ('HOT_LEAD', 'REORDER', 'DEBTOR', 'REACTIVATION');

-- CreateTable
CREATE TABLE "message_templates" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "category" "MessageCategory" NOT NULL,
    "body" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "message_templates_business_id_category_key" ON "message_templates"("business_id", "category");

-- AddForeignKey
ALTER TABLE "message_templates" ADD CONSTRAINT "message_templates_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
