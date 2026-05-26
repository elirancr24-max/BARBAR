-- Add per-employee commission override (nullable = inherit BusinessSettings.defaultCommissionPct)
ALTER TABLE "Employee" ADD COLUMN "commissionPct" INTEGER;
