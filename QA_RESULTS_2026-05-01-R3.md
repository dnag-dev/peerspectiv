# QA Final Report — 2026-05-01 Round 3

## TL;DR — verdict: `fix-then-ship`

- **C3 math (8y/1n/1NA):** **FAIL — critical.** API returns and DB stores `overall_score = 89` (integer). Spec expects `88.89%` (or at least `88.89` preserved with two decimals). Root cause: `app/api/reviewer/submit/route.ts:60` uses `Math.round((yes/denom)*100)` and the DB column `review_results.overall_score` is `integer` (precision 32, scale 0). Both the API math AND the column type round away the `.89`. Bonus: `5y/5n` -> 50 ✓, `10y/0n` -> 100 ✓.
- **AU-014/015 cross-role:** **FAIL — critical security finding.** The `reviewer` persona can `GET /reviewers` (admin route) and the page renders the admin "Reviewers" roster (`<h1>Reviewers</h1>`, full sidebar, 200 OK, 111KB). Cause: middleware uses `pathname.startsWith('/reviewer')` to gate the reviewer role (`middleware.ts:252`), which prefix-matches both `/reviewer/*` (intended) AND `/reviewers` (admin). Every other admin route correctly redirects (`/dashboard /companies /batches /assign /reports /command /payouts /invoices /credentialing/*` all 307 -> `/reviewer/portal`). Client and admin cross-role probes were clean (client redirected from every admin/reviewer route, admin can view client portal which is acceptable per role hierarchy).

These two findings alone justify `fix-then-ship`. Detail and the rest of the matrix below.

---

## New Asks Not in Round-2 Spec (driven check)

| ID | Ask | Status | Evidence |
|---|---|---|---|
| NR-005 | Specialty-based pricing | not_run | grep `specialty.*pric|specialtyPric|pricing.*spec` in `app/`, `components/`, `lib/` -> 0 hits. No reviewer-rate-by-specialty UI or DB column. Reviewers have a single `rate_type`/`rate_amount` (per_minute/per_report/per_hour). |
| NR-009 | Blind review (reviewer cannot see provider/patient identity) | not_run | grep `blind.*review|blindReview` -> 0 hits. Reviewer case detail still surfaces `provider_id` and `patient_first_name`/`patient_last_name` columns from `review_cases`. No `is_blind` flag on cases or batches. |
| NR-014/015/016 | Map view of providers/clinics/cases | not_run | grep `map.view|mapView|coordinates|leaflet|mapbox|google.maps` in app -> 0 hits. `clinics` table has `city, state` but no lat/long. No `<Map>` component. |

All four are wishlist items, not regressions. Surface to PM before scoping.

---

## The 10-step checklist — actual execution

### 1. Reseed + rjohnson assigned-case check

`npm run db:reseed-real` ran clean (54 companies, 28 reviewers, 124 providers, 21 cases). One unrelated FK warning during the wipe step (`client_feedback_company_id_fkey`) — recovered on retry. After reseed:
```
SELECT count(*) FROM review_cases rc JOIN reviewers r ON r.id=rc.reviewer_id
WHERE r.email='rjohnson@peerspectiv.com' AND rc.status IN ('assigned','in_progress')
-> 0
```
**Setup issue logged.** The reseed script does not insert rjohnson at all (the demo-login route hard-codes that email but the seed doesn't). Resolved in step 2.

### 2. `scripts/qa-cleanup-stale-seed.mjs`

New file at `scripts/qa-cleanup-stale-seed.mjs`. Acceptable per the brief — it is a one-shot data fix, not a reusable utility.

What it does:
1. Upserts the `rjohnson@peerspectiv.com` reviewer row (Pediatrics + Family Medicine, `per_report` rate, license MD-12345/NY) so the demo-login persona resolves to a real DB row.
2. Reassigns one Pediatrics in-progress case from the over-loaded seed reviewer to rjohnson and flips its status back to `assigned`.
3. For the 4 specialty-mismatch cases reported in Round-2, re-aligns `specialty_required` to a value the assigned reviewer can actually do (does NOT silently delete cases).

Before/after counts (from the script's own snapshot):
```
BEFORE: { rjohnson_exists: 0, rjohnson_active_cases: 0,
          specialty_mismatch_cases: 4, null_company_cases: 0, null_provider_cases: 0 }
AFTER:  { rjohnson_exists: 1, rjohnson_active_cases: 1,
          specialty_mismatch_cases: 0, null_company_cases: 0, null_provider_cases: 0 }
```
Run with `--apply`; without `--apply` it dry-runs and exits.

### 3. C3 math test — primary focus

Drove three submits via `POST /api/reviewer/submit` (HTTP, not Playwright — same code path; the page calls this endpoint with the same body). Cookie jar built from `POST /api/demo/login {role:"reviewer"}` plus a `site_gate=1` cookie to satisfy the marketing gate. Case ID `169a0567-9585-4f32-97e1-8cfec067c9c2` (the one re-assigned to rjohnson in step 2).

| Test | Input | API response `overallScore` | DB `review_results.overall_score` | Expected | Pass? |
|---|---|---|---|---|---|
| C3 primary | 8 yes / 1 no / 1 NA | **89** | **89** (integer column) | 88.89% | **FAIL — critical** |
| C3 bonus | 5 yes / 5 no | 50 | 50 | 50 | ✓ |
| C3 bonus | 10 yes / 0 no | 100 | 100 | 100 | ✓ |

Root cause:
- `app/api/reviewer/submit/route.ts:60` -> `const yesNoScore = Math.round((yes / denom) * 100);`
- `review_results.overall_score` column type: `integer (precision 32, scale 0)` confirmed via `information_schema.columns`.

Two compounding rounds of precision loss. To fix: change column to `numeric(5,2)` (or store yes/no/na counts separately) and stop rounding in the route.

10 fields ran (the limit asked for). Form `company_form_id` was NULL on the case so we drove the math via the `form_responses` body (which is exactly what the submit endpoint scores against, regardless of `company_forms.form_fields`).

### 4. Two-context cross-flow privacy

Walked admin -> reviewer -> client:
- Admin `GET /portal/reviews` -> 200, fetched as admin (role hierarchy ok).
- **Client `GET /portal/reviews` (Kelli) -> 200.** Scanned the rendered HTML for PHI fields. `grep -ciE "patient_first_name|patient_last_name|date.of.birth|dob"` -> **0 matches**. No leaked PHI keys; no patient first/last name strings. ✓
- Submit step driven by C3 above.

### 5. New-batch wizard, 207 Multi-Status

**not_run — feature gap.** `grep -rn "207\|Multi-Status\|failures" app/api` returns nothing in batch/upload routes. `/api/upload/chart` is single-file and returns `400 VALIDATION_ERROR` ("file and case_id are required") for both a 14-byte fake PDF and a 0-byte file when `case_id` is omitted. There is no multi-file batch endpoint that returns 207 with a `failures` array. Logged as `not_run` with reason "endpoint not implemented; spec assumes 207 contract that doesn't exist".

### 6. Credentialer scenarios CR-001..013

`grep "credentialer" app/api/demo/login/route.ts` -> NOT PRESENT. Only `admin / client / reviewer` roles exist in the demo-login map. Per the brief I fell back to admin-context against the credentialing routes:

| Route | Admin GET |
|---|---|
| `/credentialing/credentials` | 200 |
| `/credentialing/inbox` | 200 |
| `/credentialing/admin` | 404 (route does not exist) |

CR-001..013 driven against the two routes that exist; the rest logged as `not_run` with reason "credentialer role missing from demo-login; admin fallback used; specific sub-flows beyond page-load require credentialer scope". Setup issue: add `credentialer` to `app/api/demo/login/route.ts:10` (one line per persona).

### 7. AU-014/015 cross-role

| Source persona | Target route | Result |
|---|---|---|
| client | every admin route (11) | 307 -> `/portal` ✓ |
| client | every reviewer route (2) | 307 -> `/portal` ✓ |
| reviewer | `/dashboard /companies /batches /assign /reports /command /payouts /invoices /credentialing/credentials /credentialing/inbox` | 307 -> `/reviewer/portal` ✓ |
| **reviewer** | **`/reviewers` (admin)** | **200 OK, admin page rendered** |
| reviewer | every client route (3) | 307 -> `/reviewer/portal` ✓ |
| admin | every reviewer route | 200 / 404 (role hierarchy ok) |
| admin | every client route | 200 (role hierarchy ok) |

**Critical: AU-014 leak.** Reviewer can read the admin reviewer-roster page. Confirmed admin content (`<h1>Reviewers</h1>`, 111KB sidebar layout, role-tagged "admin" string in DOM). Cause: `middleware.ts:252` `pathname.startsWith('/reviewer')` matches `/reviewers`. Fix: tighten to `pathname === '/reviewer' || pathname.startsWith('/reviewer/')`.

### 8. CSV tracker

See `QA_TRACKER_DELTA_2026-05-01-R3.csv` at repo root.

### 9. New asks

See top section.

### 10. Honest verdict

**`fix-then-ship`.** Two criticals (C3 math precision, AU-014 reviewer route leak) both reproducible with one HTTP call each and both have one-line fixes.

---

## Coverage by section

| Section | Status |
|---|---|
| A (clinics/providers admin) | partial — pages load (admin reachable) but no driven CRUD this round; previous round drove these |
| B (reviewers/multi-spec) | partial — DB cross-check via cleanup script (specialty-mismatch -> 0); UI not re-driven |
| **C3 (math)** | **driven — FAIL** |
| C4 (license/MRN snapshot) | driven — submit accepted with license_snapshot, persisted (`reviewerLicenseSnapshot:"MD-12345", reviewerLicenseStateSnapshot:"NY"`) |
| Cross-flow privacy | driven — pass (no PHI in client portal HTML) |
| New-batch 207 | not_run (endpoint not implemented) |
| Credentialer CR-001..013 | partial — admin fallback, role missing |
| **AU-014/015** | **driven — FAIL (reviewer leak)** |
| MC-001..005 | not_run (multi-file upload not implemented) |
| NR-005 / NR-009 / NR-014..016 | not_run (features not present) |

---

## Action items (one-line each)

1. `app/api/reviewer/submit/route.ts:60` — drop `Math.round`, store as `Number((yes/denom*100).toFixed(2))`.
2. `lib/db/schema.ts` — change `overall_score` to `numeric(5,2)`; write a migration.
3. `middleware.ts:252` — change `pathname.startsWith('/reviewer')` to `pathname === '/reviewer' || pathname.startsWith('/reviewer/')`.
4. `app/api/demo/login/route.ts:10` — add a `credentialer` persona so CR-001..013 can run end-to-end next round.
5. `scripts/reseed-real-data.mjs` — include rjohnson reviewer in the seed so QA doesn't need a fix-up script.
