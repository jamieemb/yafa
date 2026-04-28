-- AlterTable
ALTER TABLE "RecurringItem" ADD COLUMN "bankAccount" TEXT;

-- CreateIndex
CREATE INDEX "RecurringItem_bankAccount_idx" ON "RecurringItem"("bankAccount");
