-- Block unwanted customers
ALTER TABLE "Customer" ADD COLUMN "blocked" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Customer" ADD COLUMN "blockedReason" TEXT;
