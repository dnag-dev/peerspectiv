-- 009_post_ashton_review.sql
-- Post Ashton/Viji review additions, Apr 28 2026.
-- Renumbered from "006" in the spec (existing migrations go through 008).

-- ─────────────────────────────────────────────────────────────────────
-- COMPANIES — billing cadence + delivery preference + invoice itemization
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS billing_cycle text
    DEFAULT 'quarterly';

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name='companies' AND constraint_name='companies_billing_cycle_check'
  ) THEN
    ALTER TABLE companies ADD CONSTRAINT companies_billing_cycle_check
      CHECK (billing_cycle IN ('monthly','quarterly','semi-annual','annual','random'));
  END IF;
END $$;

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS fiscal_year_start_month integer DEFAULT 1;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name='companies' AND constraint_name='companies_fiscal_month_check'
  ) THEN
    ALTER TABLE companies ADD CONSTRAINT companies_fiscal_month_check
      CHECK (fiscal_year_start_month BETWEEN 1 AND 12);
  END IF;
END $$;

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS delivery_preference text DEFAULT 'portal';

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name='companies' AND constraint_name='companies_delivery_pref_check'
  ) THEN
    ALTER TABLE companies ADD CONSTRAINT companies_delivery_pref_check
      CHECK (delivery_preference IN ('email','portal','both'));
  END IF;
END $$;

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS itemize_invoice boolean DEFAULT false;

-- ─────────────────────────────────────────────────────────────────────
-- CLINICS — optional FQHC sub-locations
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clinics (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  city text,
  state text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_clinics_company ON clinics(company_id);

ALTER TABLE review_cases
  ADD COLUMN IF NOT EXISTS clinic_id uuid REFERENCES clinics(id);

-- ─────────────────────────────────────────────────────────────────────
-- REVIEWERS — multi-specialty, credential expiry, caseload cap, efficiency
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE reviewers ADD COLUMN IF NOT EXISTS specialties text[] DEFAULT '{}';
ALTER TABLE reviewers ADD COLUMN IF NOT EXISTS credential_valid_until date;
ALTER TABLE reviewers ADD COLUMN IF NOT EXISTS max_case_load integer DEFAULT 75;
ALTER TABLE reviewers ADD COLUMN IF NOT EXISTS avg_minutes_per_chart numeric(8,2);

-- Backfill specialties[] from single-string specialty
UPDATE reviewers
SET specialties = ARRAY[specialty]
WHERE (specialties IS NULL OR array_length(specialties,1) IS NULL)
  AND specialty IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────
-- REVIEW_CASES — MRN, reassignment, patient name (admin-only)
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE review_cases ADD COLUMN IF NOT EXISTS mrn_number text;
ALTER TABLE review_cases ADD COLUMN IF NOT EXISTS reassignment_requested boolean DEFAULT false;
ALTER TABLE review_cases ADD COLUMN IF NOT EXISTS reassignment_reason text;
ALTER TABLE review_cases ADD COLUMN IF NOT EXISTS reassignment_requested_at timestamptz;
ALTER TABLE review_cases ADD COLUMN IF NOT EXISTS patient_first_name text;
ALTER TABLE review_cases ADD COLUMN IF NOT EXISTS patient_last_name text;
ALTER TABLE review_cases ADD COLUMN IF NOT EXISTS is_pediatric boolean DEFAULT false;

-- ─────────────────────────────────────────────────────────────────────
-- REVIEW_RESULTS — reviewer signature block + MRN snapshot
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE review_results ADD COLUMN IF NOT EXISTS mrn_number text;
ALTER TABLE review_results ADD COLUMN IF NOT EXISTS reviewer_signature_text text;

-- ─────────────────────────────────────────────────────────────────────
-- COMPANY_FORMS — AI recommendations toggle
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE company_forms
  ADD COLUMN IF NOT EXISTS allow_ai_generated_recommendations boolean DEFAULT false;

-- form_fields jsonb item shape grows to optionally include:
--   allow_na: boolean (yes_no only)
--   default_value: 'yes' | 'no' | 'na' | null
--   required_text_on_non_default: boolean
--   ops_term: string | null
-- Reader code defaults missing keys; no schema change required.

-- ─────────────────────────────────────────────────────────────────────
-- INVOICES — quantity override + itemized lines + adjustment reason
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS quantity_override integer;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS itemized_lines jsonb;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS adjustment_reason text;

-- ─────────────────────────────────────────────────────────────────────
-- CASE_REASSIGNMENT_REQUESTS — admin queue for reviewer kick-backs
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS case_reassignment_requests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id uuid NOT NULL REFERENCES review_cases(id) ON DELETE CASCADE,
  reviewer_id uuid REFERENCES reviewers(id),
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved','dismissed')),
  resolved_by text,
  resolved_at timestamptz,
  resolution_note text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reassign_status ON case_reassignment_requests(status);
CREATE INDEX IF NOT EXISTS idx_reassign_case ON case_reassignment_requests(case_id);

-- ─────────────────────────────────────────────────────────────────────
-- USER_ROLES — credentialing role
-- This repo uses Clerk publicMetadata + a thin user_roles table for the
-- non-Clerk demo path. Create a permissive table; if it doesn't exist
-- elsewhere, this is the canonical store.
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id text NOT NULL UNIQUE,
  email text,
  role text NOT NULL CHECK (role IN ('admin','reviewer','client','credentialing')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);
