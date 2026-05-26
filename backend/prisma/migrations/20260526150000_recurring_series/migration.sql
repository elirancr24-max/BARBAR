ALTER TABLE "Appointment" ADD COLUMN "recurringSeriesId" TEXT;
CREATE INDEX "Appointment_recurringSeriesId_startAt_idx" ON "Appointment"("recurringSeriesId", "startAt");
