BEGIN;

-- ── New tables ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS peer_invite_tokens (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  peer_email text NOT NULL,
  token text UNIQUE NOT NULL,
  invited_by text,
  invited_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  peer_id uuid REFERENCES peers(id) ON DELETE SET NULL,
  submission_data jsonb,
  submission_status text NOT NULL DEFAULT 'invited'
    CHECK (submission_status IN ('invited','submitted','approved','rejected')),
  reviewed_by text,
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS peer_state_audit (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  peer_id uuid NOT NULL REFERENCES peers(id) ON DELETE CASCADE,
  from_state text,
  to_state text NOT NULL,
  changed_by text,
  change_reason text,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS credentialer_users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_user_id text UNIQUE,
  email text UNIQUE NOT NULL,
  full_name text,
  per_peer_rate numeric(10,2) NOT NULL DEFAULT 100.00 CHECK (per_peer_rate > 0),
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS peer_credentialing_log (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  peer_id uuid NOT NULL REFERENCES peers(id) ON DELETE CASCADE,
  credentialer_id uuid REFERENCES credentialer_users(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN ('uploaded_license','marked_credentialed','set_valid_until','renewed','flagged')),
  valid_until_old date,
  valid_until_new date,
  document_url text,
  notes text,
  rate_at_action numeric(10,2),
  performed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS license_notification_log (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  peer_id uuid NOT NULL REFERENCES peers(id) ON DELETE CASCADE,
  threshold text NOT NULL CHECK (threshold IN ('14_day','7_day','3_day','1_day','post_expiry')),
  license_expiry_date date NOT NULL,
  sent_to text,
  sent_at timestamptz NOT NULL DEFAULT now(),
  email_id text,
  UNIQUE (peer_id, threshold, license_expiry_date)
);

-- tags table already exists (from migration 007). Extend with scope/company/period
-- and replace the global unique-on-name with the partial indexes from the spec.
ALTER TABLE tags
  ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'global'
    CHECK (scope IN ('global','cadence')),
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS period_label text;

ALTER TABLE tags DROP CONSTRAINT IF EXISTS tags_name_key;
DROP INDEX IF EXISTS tags_name_key;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_tag_global ON tags (name) WHERE scope = 'global';
CREATE UNIQUE INDEX IF NOT EXISTS uniq_tag_cadence ON tags (name, company_id, period_label) WHERE scope = 'cadence';

CREATE TABLE IF NOT EXISTS case_tags (
  case_id uuid REFERENCES review_cases(id) ON DELETE CASCADE,
  tag_id uuid REFERENCES tags(id) ON DELETE CASCADE,
  tagged_by text,
  tagged_at timestamptz NOT NULL DEFAULT now(),
  source text CHECK (source IN ('ai','manual')),
  PRIMARY KEY (case_id, tag_id)
);

CREATE TABLE IF NOT EXISTS company_specialty_rates (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  specialty text NOT NULL,
  rate_amount numeric(10,2) NOT NULL CHECK (rate_amount > 0),
  is_default boolean DEFAULT false,
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, specialty)
);

-- invoices table already exists (richer schema, migration 007). Skip CREATE.

-- ── Column additions to existing tables ─────────────────────────────────────

ALTER TABLE peers
  ADD COLUMN IF NOT EXISTS state text NOT NULL DEFAULT 'pending_credentialing'
    CHECK (state IN ('invited','pending_admin_review','pending_credentialing','active','license_expired','suspended','archived')),
  ADD COLUMN IF NOT EXISTS state_changed_at timestamptz,
  ADD COLUMN IF NOT EXISTS state_changed_by text,
  ADD COLUMN IF NOT EXISTS state_change_reason text,
  ADD COLUMN IF NOT EXISTS npi text;

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS cadence_period_type text NOT NULL DEFAULT 'quarterly'
    CHECK (cadence_period_type IN ('monthly','quarterly','custom_multi_month','random')),
  ADD COLUMN IF NOT EXISTS cadence_period_months integer,
  ADD COLUMN IF NOT EXISTS delivery_method text NOT NULL DEFAULT 'portal'
    CHECK (delivery_method IN ('portal','secure_email','both'));

ALTER TABLE review_cases DROP CONSTRAINT IF EXISTS review_cases_status_check;
ALTER TABLE review_cases ADD CONSTRAINT review_cases_status_check
  CHECK (status IN ('unassigned','pending_approval','assigned','in_progress','completed','past_due','suggested','returned_by_peer'));

ALTER TABLE review_cases
  ADD COLUMN IF NOT EXISTS mrn_source text
    CHECK (mrn_source IN ('ai_extracted','manual','corrected')),
  ADD COLUMN IF NOT EXISTS cadence_period_label text,
  ADD COLUMN IF NOT EXISTS assignment_source text DEFAULT 'manual'
    CHECK (assignment_source IN ('ai_suggested','manual','reassigned','split')),
  ADD COLUMN IF NOT EXISTS returned_by_peer_at timestamptz,
  ADD COLUMN IF NOT EXISTS returned_reason text,
  ADD COLUMN IF NOT EXISTS manual_overrides text[] DEFAULT '{}'::text[];

ALTER TABLE company_forms
  ADD COLUMN IF NOT EXISTS scoring_system text NOT NULL DEFAULT 'yes_no_na'
    CHECK (scoring_system IN ('yes_no_na','abc_na','pass_fail')),
  ADD COLUMN IF NOT EXISTS pass_fail_threshold jsonb;

ALTER TABLE review_results
  ADD COLUMN IF NOT EXISTS scoring_breakdown jsonb,
  ADD COLUMN IF NOT EXISTS scoring_engine_version text;

COMMIT;
