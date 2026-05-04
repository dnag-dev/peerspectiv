-- 016_rename-case-reassignment-reviewer-id.sql
-- Phase 1.2 cleanup: case_reassignment_requests was added in migration 005
-- (Ashton requests, post-rename) and uses `reviewer_id`. Phase 1.2 schema.ts
-- declares it as `peerId: uuid('peer_id')` but the column was never renamed
-- in the DB. Result: every query against case_reassignment_requests fails
-- in prod with "column case_reassignment_requests.peer_id does not exist".
-- Affected pages: /reassignments, /assign (both 500 in prod).

BEGIN;

ALTER TABLE case_reassignment_requests
  RENAME COLUMN reviewer_id TO peer_id;

-- FK constraint may have an old auto-generated name; rename for clarity.
ALTER TABLE case_reassignment_requests
  RENAME CONSTRAINT case_reassignment_requests_reviewer_id_fkey
  TO case_reassignment_requests_peer_id_fkey;

COMMIT;
