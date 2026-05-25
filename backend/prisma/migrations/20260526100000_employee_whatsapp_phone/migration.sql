-- Per-barber WhatsApp routing phone (overrides user.phone for WhatsApp links)
ALTER TABLE "Employee" ADD COLUMN "whatsappPhone" TEXT;
