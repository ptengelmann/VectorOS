-- AlterTable
ALTER TABLE "deals" ADD COLUMN "outcome" TEXT,
ADD COLUMN "lostReason" TEXT,
ADD COLUMN "closedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "deals_outcome_idx" ON "deals"("outcome");

-- CreateIndex
CREATE INDEX "deals_closedAt_idx" ON "deals"("closedAt");
