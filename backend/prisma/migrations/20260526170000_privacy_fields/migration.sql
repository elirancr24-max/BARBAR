ALTER TABLE "Customer" ADD COLUMN "marketingConsent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Customer" ADD COLUMN "marketingConsentAt" TIMESTAMP(3);
ALTER TABLE "Customer" ADD COLUMN "marketingConsentRevokedAt" TIMESTAMP(3);
ALTER TABLE "Customer" ADD COLUMN "dataExportRequestedAt" TIMESTAMP(3);
ALTER TABLE "Customer" ADD COLUMN "dataDeletionRequestedAt" TIMESTAMP(3);
ALTER TABLE "Customer" ADD COLUMN "dataDeletionApprovedAt" TIMESTAMP(3);
