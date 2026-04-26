-- Migration 007: Reports, Invoices, Tags, Settings, Aautipay
-- Mirrors lib/db/schema.ts additions in PHASE 1.
-- All ALTER TABLE statements use IF NOT EXISTS to be re-run-safe.

-- ─── Companies (billing) ─────────────────────────────────────────────────────
ALTER TABLE companies ADD COLUMN IF NOT EXISTS per_review_rate            numeric(10,2);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS billing_cycle_type         text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS aautipay_subscription_id   text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS aautipay_subscription_status text;

-- ─── Reviewers (license + KYC + Aautipay) ───────────────────────────────────
ALTER TABLE reviewers ADD COLUMN IF NOT EXISTS license_number              text;
ALTER TABLE reviewers ADD COLUMN IF NOT EXISTS license_state               text;
ALTER TABLE reviewers ADD COLUMN IF NOT EXISTS license_file_url            text;
ALTER TABLE reviewers ADD COLUMN IF NOT EXISTS w9_status                   text DEFAULT 'not_collected';
ALTER TABLE reviewers ADD COLUMN IF NOT EXISTS aautipay_beneficiary_id     text;
ALTER TABLE reviewers ADD COLUMN IF NOT EXISTS aautipay_beneficiary_status text;
ALTER TABLE reviewers ADD COLUMN IF NOT EXISTS aautipay_bank_account_id    text;
ALTER TABLE reviewers ADD COLUMN IF NOT EXISTS aautipay_bank_status        text;
ALTER TABLE reviewers ADD COLUMN IF NOT EXISTS payment_ready               boolean DEFAULT false;

-- ─── Reviewer Payouts (Aautipay link) ───────────────────────────────────────
ALTER TABLE reviewer_payouts ADD COLUMN IF NOT EXISTS aautipay_payout_id              text;
ALTER TABLE reviewer_payouts ADD COLUMN IF NOT EXISTS aautipay_payout_status          text;
ALTER TABLE reviewer_payouts ADD COLUMN IF NOT EXISTS external_payout_initiated_at    timestamptz;
ALTER TABLE reviewer_payouts ADD COLUMN IF NOT EXISTS external_payout_completed_at    timestamptz;
ALTER TABLE reviewer_payouts ADD COLUMN IF NOT EXISTS external_fail_reason            text;

-- ─── Contracts ──────────────────────────────────────────────────────────────
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS aautipay_subscription_initiated_at timestamptz;

-- ─── Review Results (reviewer license snapshot) ─────────────────────────────
ALTER TABLE review_results ADD COLUMN IF NOT EXISTS reviewer_name_snapshot          text;
ALTER TABLE review_results ADD COLUMN IF NOT EXISTS reviewer_license_snapshot       text;
ALTER TABLE review_results ADD COLUMN IF NOT EXISTS reviewer_license_state_snapshot text;

-- ─── Reports ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS report_templates (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_key  text NOT NULL UNIQUE,
  display_name  text NOT NULL,
  description   text,
  is_active     boolean DEFAULT true,
  created_at    timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS saved_reports (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    uuid REFERENCES companies(id) ON DELETE CASCADE,
  template_key  text NOT NULL,
  report_name   text NOT NULL,
  range_start   date,
  range_end     date,
  filters       jsonb,
  created_by    text,
  created_at    timestamptz DEFAULT now(),
  last_run_at   timestamptz
);

CREATE TABLE IF NOT EXISTS report_runs (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  saved_report_id uuid REFERENCES saved_reports(id) ON DELETE SET NULL,
  template_key    text NOT NULL,
  company_id      uuid REFERENCES companies(id),
  range_start     date,
  range_end       date,
  filters         jsonb,
  pdf_url         text,
  status          text NOT NULL DEFAULT 'pending',
  fail_reason     text,
  generated_by    text,
  created_at      timestamptz DEFAULT now(),
  completed_at    timestamptz
);

-- ─── Invoices ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id                       uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number           text NOT NULL UNIQUE,
  company_id               uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  contract_id              uuid REFERENCES contracts(id),
  range_start              date NOT NULL,
  range_end                date NOT NULL,
  unit_price               numeric(10,2) NOT NULL,
  review_count             integer NOT NULL DEFAULT 0,
  provider_count           integer NOT NULL DEFAULT 0,
  subtotal                 numeric(12,2) NOT NULL,
  tax_amount               numeric(12,2) DEFAULT 0,
  total_amount             numeric(12,2) NOT NULL,
  currency                 text DEFAULT 'USD',
  status                   text NOT NULL DEFAULT 'draft',
  description              text,
  line_items               jsonb,
  payment_provider         text,
  external_invoice_id      text,
  external_subscription_id text,
  payment_link_url         text,
  payment_method           text,
  paid_at                  timestamptz,
  pdf_url                  text,
  sent_at                  timestamptz,
  viewed_at                timestamptz,
  due_date                 date,
  notes                    text,
  created_by               text,
  created_at               timestamptz DEFAULT now(),
  updated_at               timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS invoices_company_status_idx ON invoices (company_id, status);

-- ─── Tags ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tags (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         text NOT NULL UNIQUE,
  color        text DEFAULT 'cobalt',
  description  text,
  usage_count  integer DEFAULT 0,
  created_by   text,
  created_at   timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tag_associations (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tag_id      uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id   uuid NOT NULL,
  created_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tag_assoc_entity_idx ON tag_associations (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS tag_assoc_tag_idx    ON tag_associations (tag_id);

-- ─── Settings ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS global_settings (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key   text NOT NULL UNIQUE,
  setting_value jsonb NOT NULL,
  description   text,
  updated_by    text,
  updated_at    timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS company_settings (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  setting_key   text NOT NULL,
  setting_value jsonb NOT NULL,
  updated_by    text,
  updated_at    timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS company_settings_company_key_idx
  ON company_settings (company_id, setting_key);

-- ─── Aautipay event log ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS aautipay_events (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type       text NOT NULL,
  external_id      text NOT NULL,
  raw_payload      jsonb NOT NULL,
  status           text,
  processed_at     timestamptz,
  processing_error text,
  received_at      timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS aautipay_events_event_external_idx
  ON aautipay_events (event_type, external_id);

-- ─── Seed report templates ──────────────────────────────────────────────────
INSERT INTO report_templates (template_key, display_name, description) VALUES
  ('provider_highlights',   'Provider Highlights',   'Per-provider score breakdown by review type'),
  ('specialty_highlights',  'Specialty Highlights',  'Aggregate scores by specialty across the org'),
  ('question_analytics',    'Question Analytics',    'Question-by-question compliance with provider attribution'),
  ('invoice',               'Invoice',               'Billing invoice for peer review services'),
  ('quality_certificate',   'Quality Certificate',   'Formal HRSA compliance certificate'),
  ('peer_earnings_summary', 'Peer Earnings Summary', 'Per-reviewer earnings statement')
ON CONFLICT (template_key) DO NOTHING;

-- ─── Seed global settings ───────────────────────────────────────────────────
INSERT INTO global_settings (setting_key, setting_value, description) VALUES
  ('file_expiration_hours',       '"48"',                          'Hours before uploaded chart files are auto-deleted'),
  ('global_pay_rate_per_review',  '"35.00"',                       'Default per-review pay rate for reviewers'),
  ('default_invoice_due_days',    '"30"',                          'Default net-N days on invoices'),
  ('peerspectiv_company_name',    '"Peerspectiv LLC"',             'Legal entity name on invoices'),
  ('peerspectiv_address',         '""',                            'Mailing address on invoices'),
  ('peerspectiv_email',           '"billing@peerspectiv.com"',     'Billing email')
ON CONFLICT (setting_key) DO NOTHING;
