-- No-show tracking on Customer
ALTER TABLE "Customer" ADD COLUMN "noShowCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Customer" ADD COLUMN "lastNoShowAt" TIMESTAMP(3);

-- Deposit metadata on Appointment
ALTER TABLE "Appointment" ADD COLUMN "depositRequired" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Appointment" ADD COLUMN "depositPaidAt" TIMESTAMP(3);
ALTER TABLE "Appointment" ADD COLUMN "depositMethod" TEXT;
ALTER TABLE "Appointment" ADD COLUMN "depositRef" TEXT;

-- Secure self-cancel token table
CREATE TABLE "AppointmentCancelToken" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AppointmentCancelToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AppointmentCancelToken_appointmentId_key" ON "AppointmentCancelToken"("appointmentId");
CREATE UNIQUE INDEX "AppointmentCancelToken_tokenHash_key" ON "AppointmentCancelToken"("tokenHash");
CREATE INDEX "AppointmentCancelToken_tokenHash_idx" ON "AppointmentCancelToken"("tokenHash");

ALTER TABLE "AppointmentCancelToken"
    ADD CONSTRAINT "AppointmentCancelToken_appointmentId_fkey"
    FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
