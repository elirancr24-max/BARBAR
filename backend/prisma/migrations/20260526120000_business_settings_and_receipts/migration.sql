-- AlterTable: add receiptNumber to Payment
ALTER TABLE "Payment" ADD COLUMN "receiptNumber" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Payment_receiptNumber_key" ON "Payment"("receiptNumber");

-- CreateTable
CREATE TABLE "BusinessSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "businessName" TEXT NOT NULL DEFAULT 'BarBar',
    "businessAddress" TEXT,
    "businessTaxId" TEXT,
    "taxStatus" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "vatRate" INTEGER NOT NULL DEFAULT 17,
    "requireDeposit" BOOLEAN NOT NULL DEFAULT false,
    "depositAgorot" INTEGER NOT NULL DEFAULT 0,
    "depositMethod" TEXT NOT NULL DEFAULT 'BIT_LINK',
    "bitPhone" TEXT,
    "noShowThreshold" INTEGER NOT NULL DEFAULT 1,
    "autoReminder24h" BOOLEAN NOT NULL DEFAULT true,
    "allowSelfCancel" BOOLEAN NOT NULL DEFAULT true,
    "selfCancelCutoffHr" INTEGER NOT NULL DEFAULT 4,
    "defaultCommissionPct" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessSettings_pkey" PRIMARY KEY ("id")
);
