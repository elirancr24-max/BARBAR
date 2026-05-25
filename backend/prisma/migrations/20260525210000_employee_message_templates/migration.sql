-- Per-barber WhatsApp message templates (override defaults)
ALTER TABLE "Employee" ADD COLUMN "messageTemplates" JSONB;
