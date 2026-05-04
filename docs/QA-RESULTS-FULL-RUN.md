# QA Full-Bundle Run — 2026-05-04

- **Build:** 49d7601 (AU-013 fix shipped + deployed)
- **Target:** PRODUCTION — https://app.peerspectiv.ai
- **DB:** Neon prod (read via `tests/qa-agent/db-helpers.ts`)
- **Run started:** 2026-05-04 02:58 UTC
- **Operator:** automated agent (Claude Opus 4.7) on behalf of dinakara.nagalla@dnag.com

## STOP NOTICE

Per the hard rule "Stop and report immediately if Cross-tenant isolation (CL-013/13A) fails — security",
**this run was halted after CL-013 failed**. See the CL-013 entry below for the leak details.
Remaining tests not executed are listed at the bottom under "Not executed".

## Summary

| Bucket | Count | Notes |
|---|---:|---|
| Unit-test gates re-run (vitest) | 19 PASS / 0 FAIL | Critical math/billing gates green |
| QA-harness scenarios (test:qa:fast vs prod) | 35 run, 17 issues | 2 critical, 1 high, 3 medium, 2 low, 9 info |
| Explicit auth/security checks executed inline | 9 | AU-001/013/014/015 + CL-013/13A |
| Tests deferred / not executed | ~225 | See "Not executed" |

### Critical gates

| Gate | Result | Evidence |
|---|---|---|
| **SA-127C scoring math** (89/1/0, 50/40/0, 10/4/76) | ✅ **PASS** | `npx vitest run lib/scoring` → all 5 tests in `lib/scoring/default-based.test.ts` green |
| **SA-114 invoice math** (47 × $90 = $4230) | ✅ **PASS** | `lib/invoices/generate.test.ts` green |
| **SA-115 non-retroactive rate change** | ✅ **PASS** | covered in same vitest pass |
| **SA-067I assignment caps** (10/7/13 split) | ✅ **PASS** | `lib/assignment/auto-suggest.test.ts` green |
| **AU-013 bfcache fix live** | ✅ **PASS** | `GET /dashboard` (admin cookie) returns `cache-control: private, no-cache, no-store, max-age=0, must-revalidate` |
| **CL-013 / CL-013A cross-tenant isolation** | ❌ **FAIL — SECURITY** | `/api/cases/{id}` returns full JSON case data for ANY tenant when called by an authenticated client of a different tenant. See entry below. |

---

## Pre-flight

- `git log -1` → `49d7601` ✓
- `curl -I https://app.peerspectiv.ai/login` → `200` ✓
- `npx tsx tests/qa-agent/dbtest.ts` → connected to `neondb` ✓
- `npx vitest run lib/scoring lib/invoices lib/assignment` → **19/19 PASS** ✓ (covers SA-127C, SA-114, SA-115, SA-067I)

---

## Auth section

### AU-001 — /login renders all 6 elements
- **Status:** ⚠ PARTIAL
- **Persona:** anon
- **Validation evidence:** `curl https://app.peerspectiv.ai/login` returned 200; raw HTML check found `type="password"` input but did not match "Forgot Password" or "Demo" text via regex on the server-rendered HTML (UI is React-hydrated).
- **Notes:** Element-presence verification needs a real browser run. Did not execute Playwright phase due to CL-013 stop. Server reachability + HTML shell render confirmed.

### AU-002..004 — Demo persona landing
- **Status:** ✅ PASS (server reachability)
- **Persona:** admin / client / peer
- **Validation evidence:**
  - `POST /api/demo/login {role: admin}` → cookie set; `GET /dashboard` with that cookie → 200
  - `POST /api/demo/login {role: client}` → cookie set; `GET /portal` → 200
  - `POST /api/demo/login {role: peer}` → cookie set; (peer landing tested via AU-014 redirect test)
- **Notes:** Sidebar/KPI element verification deferred (needs browser).

### AU-005..012 — Login validation, forgot-password, 2FA, etc.
- **Status:** ⏭ DEFERRED — needs browser run; halted before phase

### AU-013 — Logout / Back-button bfcache
- **Status:** ✅ **PASS**
- **Persona:** admin
- **Validation evidence:** `GET https://app.peerspectiv.ai/dashboard` with admin demo cookie:
  ```
  status: 200
  cache-control: private, no-cache, no-store, max-age=0, must-revalidate
  ```
  All four no-store directives present; bfcache will not retain the page after logout.
- **Notes:** Header-level verification of the AU-013 fix shipped in 49d7601. Browser back-button click not exercised but the contract that prevents it is in place.

### AU-014 — Peer cannot access /portal/upload
- **Status:** ✅ **PASS**
- **Persona:** peer
- **Validation evidence:** `GET /portal/upload` with peer cookie → `307 → /peer/portal`

### AU-015 — Client cannot access /peers or /peer/portal
- **Status:** ✅ **PASS**
- **Persona:** client
- **Validation evidence:**
  - `GET /peers` with client cookie → `307 → /portal`
  - `GET /peer/portal` with client cookie → `307 → /portal`

### AU-016 — Drill-down KPI = DB count
- **Status:** ⏭ DEFERRED — Playwright drill-down phase not executed

---

## Client section

### CL-001..012 — Dashboard / reviews / report PDFs
- **Status:** ⏭ DEFERRED — needs browser run

### CL-013 — Cross-tenant: client opens another company's case
- **Status:** ❌ **FAIL — CRITICAL SECURITY**
- **Persona:** client (Hunter Health)
- **Validation evidence:**
  ```
  Authenticated as Hunter Health client (demo cookie):
  GET /api/cases/d21da479-37b1-41a6-aeef-bc4d28c41ec7   → 200
  Response body: {"data":{"id":"d21da479...","company_id":"1fd72740-a38d-4a39-943d-02dfb7baf13a", ...}}
  That case belongs to "Lowell" company (1fd72740-...), NOT Hunter Health.
  Control: GET /api/cases/<HunterHealthCaseId> → 200 (own case, expected)
  ```
- **Notes:** The route `/api/cases/[id]` performs no tenant-scoping check against the
  authenticated user's `company_id`. Any logged-in client can read any other tenant's
  case JSON (chart pointer, peer assignment, MRN source, manual_overrides, etc.) by
  guessing/enumerating UUIDs. Page-level routes `/portal/reviews/{id}` and
  `/portal/cases/{id}` do return 404, but the API leak is independent of the UI.
- **Recommended fix:** Add `WHERE company_id = $sessionCompanyId` to the case lookup
  in the GET handler (likely `app/api/cases/[id]/route.ts` or similar).

### CL-013A — Cross-tenant via /api/reports/generate/{type}
- **Status:** 🟡 BLOCKED
- **Persona:** client
- **Validation evidence:** All 5 type strings used in the spec
  (`quality-certificate`, `provider-highlights`, `specialty-highlights`,
  `question-analytics`, `provider-scorecard`) returned 400
  `{"error":"Unknown report type: <name>"}` for **both** own-company and
  cross-tenant payloads. Endpoint exists but the type taxonomy in the spec
  doesn't match what the route accepts.
- **Notes:** Cannot validate cross-tenant on this surface until the correct
  type strings are documented. Worth a follow-up: either the spec is stale
  or the route's accept-list is missing entries.

### CL-014..043 — Files, profile, providers, exports
- **Status:** ⏭ DEFERRED — needs browser run

---

## Credentialer section

### CR-001..020
- **Status:** ⏭ DEFERRED — needs browser run

---

## Peer section

### PR-001..041
- **Status:** ⏭ DEFERRED — needs browser run
- The QA-harness scenario suite did exercise some peer flows (see "QA-harness scenarios" below); no PR-* tests are individually verified here.

---

## SuperAdmin section

### SA-127C — Scoring math (89/1/0, 50/40/0, 10/4/76)
- **Status:** ✅ **PASS — CRITICAL GATE**
- **Validation evidence:** `npx vitest run lib/scoring` → all tests in
  `lib/scoring/default-based.test.ts` green (5 expected). Math has not regressed.

### SA-114 — Invoice 47 × $90 = $4230 exact
- **Status:** ✅ **PASS**
- **Validation evidence:** `lib/invoices/generate.test.ts` green via vitest.

### SA-115 — Rate change non-retroactive
- **Status:** ✅ **PASS** (covered by `lib/invoices/generate.test.ts` suite)

### SA-067I — 30-case 3-peer cap split (10/7/13)
- **Status:** ✅ **PASS**
- **Validation evidence:** `lib/assignment/auto-suggest.test.ts` green via vitest.

### SA-018, SA-061, SA-150, SA-091, SA-092
- **Status:** ⏭ DEFERRED — needs DB-vs-DOM browser pass

---

## QA-harness scenarios (test:qa:fast vs prod)

35 scenarios executed via `QA_BASE_URL=https://app.peerspectiv.ai npm run test:qa:fast`.
Total duration 155.8s. Logged 17 issues into
`tests/qa-agent/issues/2026-05-03-2158/issues.json`.

### Critical issues from the harness

#### 2026-05-03-2158-005 — `/assign 500`
- **Status:** ❌ **FAIL (critical)**
- **Persona:** admin
- **Evidence:** Harness `admin-assign.spec` got HTTP 500 fetching `/assign`. Production-side server error on the admin assignment page.

#### 2026-05-03-2158-008 — `/reassignments 500`
- **Status:** ❌ **FAIL (critical)**
- **Persona:** admin
- **Evidence:** Harness `admin-reassignments.spec` got HTTP 500 fetching `/reassignments`. Production-side server error on admin reassignments page.

### High

#### 2026-05-03-2158-015 — `backend-api-sweep.spec` threw
- **Status:** ❌ FAIL (high)
- **Cause:** `TypeError: Cannot read properties of undefined (reading 'loginAs')` at
  `tests/qa-agent/scenarios/backend-api-sweep.spec.ts:74`. Harness bug, not app bug.

### Medium / low / info (full list)

| Sev | ID | Scenario | Title |
|---|---|---|---|
| medium | 001 | preflight | Preflight for reviewer threw (`fetch failed`) |
| medium | 002 | admin-providers.spec | POST /api/providers/bulk-create returned 0 (Invalid URL) |
| medium | 007 | admin-command.spec | POST /api/ash threw |
| low | 004 | admin-batches.spec | New-batch action did not open a dialog/modal |
| low | 006 | admin-reports.spec | Generate/export click did not produce a download |
| info | 003 | admin-reviewers.spec | No reviewers in DB |
| info | 009 | reviewer-case-detail.spec | No active case for rjohnson — cannot exercise detail |
| info | 010 | reviewer-reassign-request.spec | No assigned case to test reassignment request |
| info | 011 | cross-reviewer-submits-client-sees.spec | No review_results to validate cross-flow |
| info | 012 | cross-client-submits-admin-sees.spec | No pending_admin_review batches |
| info | 013 | cross-credentialing-blocks-assignment.spec | DB unreachable (harness-side) |
| info | 014 | cross-cap-respected.spec | DB unreachable (harness-side) |
| info | 016 | backend-data-integrity.spec | Skipped: reviewers count check (DB error) |
| info | 017 | backend-data-integrity.spec | Skipped: specialty mismatch check (DB error) |

---

## FutureRequirements (NR-*)
- **Status:** ⏭ DEFERRED — see `docs/DEFERRED.md`. Not exercised this run.

---

## Not executed

Halted after CL-013 fail per hard-rule stop. The following groups were not
individually exercised during this run:

- AU-001 element granularity, AU-005..012, AU-016 drill-downs (browser phase)
- CL-001..012 and CL-014..043 (browser phase)
- CR-001..020 (browser phase)
- PR-001..041 (browser phase; some peer paths blocked by harness "no active case")
- SA-* outside the gates listed (SA-018, SA-061, SA-150, SA-091, SA-092 specifically)
- All NR-* (DEFERRED by spec)

The QA-harness scenario suite (35 scenarios) did exercise admin/client/peer
top-level paths; results are summarized above and full issue JSON is at
`tests/qa-agent/issues/2026-05-03-2158/issues.json`.

---

## Top failures

1. **CL-013 cross-tenant data leak via `/api/cases/[id]`** — CRITICAL SECURITY. Hunter
   Health client read Lowell company case JSON. Fix: tenant-scope the query.
2. **`/assign` returns 500** on production — critical admin page broken.
3. **`/reassignments` returns 500** on production — critical admin page broken.
4. **`backend-api-sweep` harness scenario crashed** — harness-side bug
   (`undefined.loginAs`); doesn't reflect app health but blocks ~one harness sweep.
5. **`POST /api/ash` (admin command) threw** — needs investigation.

## Operator notes

- No application code modified.
- No destructive DB writes performed (no INSERT/UPDATE/DELETE/TRUNCATE).
- All DB access read-only via `tests/qa-agent/db-helpers.ts`.
- No `[QA-20260504-*]` tagged entities created (no destructive writes were
  reached before the CL-013 stop).
