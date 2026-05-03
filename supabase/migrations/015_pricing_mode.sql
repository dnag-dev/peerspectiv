-- Phase 7: per-specialty vs flat pricing mode for companies.
-- Drives invoice generation behaviour (lib/invoices/generate.ts).

BEGIN;

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS pricing_mode text NOT NULL DEFAULT 'flat'
    CHECK (pricing_mode IN ('flat','per_specialty'));

COMMIT;
