-- Amendment 13 (תיקון 13) privacy/consent fields
ALTER TABLE "Customer" ADD COLUMN "marketingConsent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Customer" ADD COLUMN "marketingConsentAt" TIMESTAMP(3);
ALTER TABLE "Customer" ADD COLUMN "termsAcceptedAt" TIMESTAMP(3);
ALTER TABLE "Customer" ADD COLUMN "privacyAcceptedAt" TIMESTAMP(3);
ALTER TABLE "Customer" ADD COLUMN "dataExportRequestedAt" TIMESTAMP(3);
ALTER TABLE "Customer" ADD COLUMN "dataDeletionRequestedAt" TIMESTAMP(3);
ALTER TABLE "Customer" ADD COLUMN "dataDeletionApprovedAt" TIMESTAMP(3);

ALTER TABLE "BusinessSettings" ADD COLUMN "privacyPolicyText" TEXT;
ALTER TABLE "BusinessSettings" ADD COLUMN "termsOfServiceText" TEXT;
