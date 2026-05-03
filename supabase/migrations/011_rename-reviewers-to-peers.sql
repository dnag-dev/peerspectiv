BEGIN;

-- 1. Rename tables
ALTER TABLE reviewers       RENAME TO peers;
ALTER TABLE reviewer_payouts RENAME TO peer_payouts;

-- 2. Rename FK columns
ALTER TABLE review_cases   RENAME COLUMN reviewer_id TO peer_id;
ALTER TABLE review_results RENAME COLUMN reviewer_id TO peer_id;
ALTER TABLE peer_payouts   RENAME COLUMN reviewer_id TO peer_id;

-- 3. Rename indexes (use IF EXISTS; some may not exist)
ALTER INDEX IF EXISTS reviewers_pkey                   RENAME TO peers_pkey;
ALTER INDEX IF EXISTS reviewers_email_unique           RENAME TO peers_email_unique;
ALTER INDEX IF EXISTS reviewers_email_key              RENAME TO peers_email_key;
ALTER INDEX IF EXISTS idx_review_cases_reviewer_id     RENAME TO idx_review_cases_peer_id;
ALTER INDEX IF EXISTS reviewer_payouts_pkey            RENAME TO peer_payouts_pkey;

-- 4. Rename FK constraints
ALTER TABLE review_cases   RENAME CONSTRAINT review_cases_reviewer_id_fkey   TO review_cases_peer_id_fkey;
ALTER TABLE review_results RENAME CONSTRAINT review_results_reviewer_id_fkey TO review_results_peer_id_fkey;
ALTER TABLE peer_payouts   RENAME CONSTRAINT reviewer_payouts_reviewer_id_fkey TO peer_payouts_peer_id_fkey;

-- 5. Drift fixes (per discovery §3) — empty tables, trivial backfill
ALTER TABLE review_results
  ADD COLUMN IF NOT EXISTS scoring_engine_version text NOT NULL DEFAULT 'default_based_v1',
  ADD COLUMN IF NOT EXISTS peer_name_at_submit    text,
  ADD COLUMN IF NOT EXISTS peer_license_at_submit text;

UPDATE review_results SET scoring_engine_version = 'legacy'
WHERE submitted_at < CURRENT_DATE;

COMMIT;
