# Future / Not-Yet-Built Requirements — Test Cases

> These tests cover requirements raised in the discovery conversations and the New_Requirement_1 doc. Most are EXPECTED TO FAIL today. Run them so the dev team has a clean checklist of what is missing. Mark Status = Fail with Severity = High/Medium and reference the requirement number in Notes.

---


## New Requirement 2: UpToDate Integration

### NR-004 — Corrective Action Plan generation references UpToDate sources

**Module:** New Requirement 2: UpToDate Integration | **Priority:** Medium

**Pre-conditions:** Feature deployed. Trends flagged in past reviews.

**Steps:**
1. Generate a Corrective Action Plan when trends are flagged.
2. Check that recommendations cite UpToDate sources / links.

**Test Data:** _(none)_

**Expected Result:** Plan includes UpToDate references / clickable links. Likely not yet built — verify with PM.

**Notes:** Future requirement. NOT in scope for current build.

---


## Future: Corrective Action Tracking

### NR-011 — Corrective Action Plan generated per quarter

**Module:** Future: Corrective Action Tracking | **Priority:** Medium

**Pre-conditions:** Feature deployed. Quarter close triggers CAP.

**Steps:**
1. End of quarter, system generates Corrective Action Plan per provider with declining trend.
2. Track plan, sign-off, and follow-up review.

**Test Data:** _(none)_

**Expected Result:** CAP doc generated, attributed to provider, with completion checklist. Follow-up review scheduled.

**Notes:** Future requirement. NOT in scope for current build.

---


## New Requirement 5: Geographical Map View (CONFIRMED — client-facing, score-aware)

> **Confirmed with Ashton (May 2026):** This is a real client-facing feature, not a sales-deck graphic. Clients see the map and can identify which **locations** are performing better. Open issue: providers in the system today are stored at the **provider level**, not the **location level** — providers can work across multiple locations. The location data has to be derived from the **chart** (each chart records the location of service). The data pipeline must extract per-chart location, then aggregate to a location-level score.

### NR-014 — Map view shows clients/companies as bubbles by state

**Module:** New Requirement 5: Geographical Map View | **Priority:** Medium

**Pre-conditions:** Feature deployed. Companies have state assignments OR location-of-service data exists from charts.

**Steps:**
1. Open Map View.
2. Verify bubbles render at correct state coordinates.
3. Bubble size reflects volume of reviews.

**Test Data:** _(none)_

**Expected Result:** Visual map renders correctly. No mis-located states. Bubbles cluster at locations where the client has reviews.

**Notes:** Future requirement. Client-facing.

---

### NR-015 — Hover over a state / location shows aggregate detail

**Module:** New Requirement 5: Geographical Map View | **Priority:** Medium

**Pre-conditions:** NR-014 working.

**Steps:**
1. Hover over a state with multiple clinic locations.
2. Inspect tooltip / popout.

**Test Data:** _(none)_

**Expected Result:** Aggregate detail shown (# of locations, total reviews this quarter, avg score). Drill-down into individual location is supported (or planned).

**Notes:** Future requirement.

---

### NR-016 — Map displays SCORES per location (clients see relative performance)

**Module:** New Requirement 5: Geographical Map View | **Priority:** Medium

**Pre-conditions:** NR-014 working. Score data aggregated to location level.

**Steps:**
1. Open Map View.
2. Inspect bubble color / shading / numeric overlay.
3. Confirm score values are present and visible.

**Test Data:** _(none)_

**Expected Result:** Each location bubble shows its score (color-coded, numeric badge, or tooltip on hover). Clients can identify high vs low performing locations at a glance. Auth-scoped — clients only see their own locations.

**Notes:** Confirmed with Ashton: scores displayed (not hidden). This drives the value of the feature.

---

### NR-017 — Provider-to-LOCATION mapping derived from charts (data pipeline)

**Module:** New Requirement 5: Geographical Map View | **Priority:** High

**Pre-conditions:** Charts contain location-of-service data. Provider records exist at provider level (not pre-tagged by location).

**Steps:**
1. Upload a batch of charts where the same provider appears at multiple locations.
2. Run the data pipeline (or wait for nightly job).
3. Open Map View > inspect provider's appearance across locations.
4. Validate against source charts: each chart contributes to the location it lists.

**Test Data:** Provider X with charts at Location A (3 charts) and Location B (5 charts).

**Expected Result:** Map aggregates correctly: Location A shows 3 of provider X's reviews, Location B shows 5. Cross-location providers handled correctly — not double-counted at a single location, not dropped because of the cross-location case. Source-of-truth = chart, not provider record.

**Notes:** Confirmed with Ashton: this is the technical blocker. Providers can work cross-location, so location must come from each chart.

---


## MOVED / RESCOPED / DELETED ITEMS (May 2026 user feedback)

| Original | Status | Where it went |
|---|---|---|
| NR-001 (A/B/C/NA Scoring) | MOVED | Super Admin SA-128 (Forms — Scoring Configuration) |
| NR-002 (Pass/Fail Scoring) | MOVED | Super Admin SA-129 (Forms — Scoring Configuration) |
| NR-003 (Scoring Configuration) | MOVED | Super Admin SA-127 (umbrella for SA-128 / SA-129) |
| NR-005 (Specialty Pricing) | MOVED | Super Admin SA-107 (per-specialty rate add) |
| NR-006 (Invoice per specialty) | MOVED | Super Admin SA-113 / SA-114 (line items + math) |
| NR-007 (Credentialer tracking) | EXISTING | Already covered by Credentialer CR-013 |
| NR-008 (Credentialer auto-pay) | EXISTING | Already covered by Credentialer CR-013 |
| NR-009 (Blind Review redaction) | **RESCOPED** | No PHI redaction. Rescoped to MRN identification — see PR-028 / PR-029 / PR-035..PR-038 in Peer/Reviewer sheet. Client-side blind-review tests (CL-043 / CL-044) DELETED. Reviewer-side PR-017 RETIRED. |
| NR-010 (Email vs Portal) | MOVED | Super Admin SA-098 + SA-131 (Download All) + SA-132 (Secure Email) |
| NR-012 (AI Trend Search) | MOVED | Super Admin SA-130 (Reports section) |
| NR-013 (Auto Reminder) | EXISTING | Already covered by Super Admin SA-092 (duplicate) |
| Tasks feature (SA-006 / SA-007 / SA-061 / SA-062) | **DELETED** | Confirmed with Ashton: feature removed entirely from sidebar, dashboard, and as a page. If "Tasks" reappears anywhere, log a bug. |

## OPEN QUESTIONS — awaiting Ashton confirmation

| Question | Why it matters | Status |
|---|---|---|
| Color theme: flip platform UI to brand colors (green/yellow/brown), keep platform cobalt/ink, or hold off? | If "flip", it's a one-day theming pass. If "hold off", we stop second-guessing. | **Will confirm** |
| When SA approves multiple AI-suggested assignments and approving them all would push the peer's load OVER Max, what happens? Options: (a) block approval at Max — SA must skip / override / wait; (b) allow soft over-cap — Max is a target, not a hard ceiling, with a warning. Suggested cases don't count toward load (so capacity calc during suggestion is unaffected), but approval-time enforcement needs a decision. | Affects SA-067B approval flow + SA-074A edge case 1. | **Will confirm** |

## CONFIRMED — Decisions logged

| Decision | Confirmed (date) | Where applied |
|---|---|---|
| Per-company review-frequency config is named **"Review Cadence"** | May 2026 | SA-063A..F (header + section) |
| Monthly tag format = **"Jan 2026"** (3-letter short month) | May 2026 | SA-063B |
| Multi-month duration tag format = **"Jan – Feb 2026"** / **"April – Aug 2026"** (short or long month, range with en-dash) | May 2026 | SA-063C |
| Quarterly tag format = **"Q1 2026"** | May 2026 | SA-063A |
| Existing cadence tags must be **REUSED**, not duplicated, on subsequent uploads in the same period | May 2026 | SA-063D |
| **Fiscal Year Start applies to every cadence frequency** (monthly, quarterly, custom). Same calendar date maps to different period labels across companies depending on their FY start. Year stamp on the tag flips mid-FY when periods cross the calendar boundary (e.g., April-FY company shows "Q4 = Jan – Mar 2027" or "Sep 2026 – Jan 2027" for multi-month) | May 2026 | SA-063A / SA-063B / SA-063C |
| **Tag scoping = Hybrid.** Cadence tags ("Q1 2026", "Jan 2026", "Apr – Aug 2026") are per-company and auto-generated by Review Cadence. Manual ad-hoc tags ("Audit", "Priority") are global and reusable across companies. Cadence tags cannot be created manually; manual creation is restricted to global ad-hoc. | May 2026 | SA-052 / SA-053 / SA-054 / SA-055 / SA-086 |
| **AI auto-populates upload metadata** (specialty, provider name, form selection) and reviewer fields (MRN). **Anything AI auto-populates is editable, and manual overrides take precedence over AI** — a subsequent AI pass must not overwrite a human-edited field. | May 2026 | SA-063D / SA-063E / SA-063G / SA-063H + PR-029 / PR-036 |
| **Batch Name = the cadence tag.** Auto-populated from the active company's Review Cadence after files are uploaded (e.g., "Q2 2026"). User does NOT type a batch name and have AI add a separate cadence tag — they are the same identifier. Batch Name is editable; manual overrides persist while the per-file cadence tag remains attached. Hard-required at submit: at least 1 file. Doctor / Form / Batch Name are AI-populated with manual fallback when AI fails. | May 2026 | SA-063 / SA-064 / CL-017 / CL-018 |
| **AI-suggested assignments + SA approval gate.** AI auto-suggests peer assignments at upload time based on (a) chart specialty matching peer specialty, (b) peer current load < Max Case Assignment, (c) peer license valid, (d) peer Active. **Suggestions are computed per-file, not per-batch — a single batch can split across multiple peers when one peer hits max capacity** (e.g., 30 Dental files split as 10 to D1, 7 to D2, 13 to D3 based on each peer's free slots). Suggestions appear with status "Suggested: {Peer}" — peer dashboard does NOT show them until SA approves. SA can: approve (single or bulk), override to a different eligible peer, or reject. | May 2026 | SA-067A / SA-067B / SA-067C / SA-067D / SA-067I |
| **Single Assignments index page.** All assignments visible on one page (Unassigned / Suggested / Assigned / In-Progress / Completed / Returned-by-Peer). Filters: status, peer, company, specialty, date, cadence tag. Reassign and Unassign actions accessible directly from the index. Drill-in shows full assignment history per case. | May 2026 | SA-067E / SA-067F / SA-067G |
| **Peer self-unassign with required comment.** Peer can return a misassigned case from the review screen with a required reason. Case status flips to "Returned by Peer". Comment is visible to SA on the Assignments page row + case detail + audit log, persisting across subsequent reassignments. Peer not paid for kicked-back cases. | May 2026 | PR-030 / SA-067H |
| **Peer Lifecycle State Machine.** 7 states: Invited / Pending Admin Review / Pending Credentialing / Active / License Expired / Suspended / Archived. Only **Active** peers can be assigned cases (filtered out of all selectors otherwise). All transitions captured in audit log with timestamp + actor + reason. SA-022B holds the canonical state table. | May 2026 | SA-022B / SA-031F / SA-031G / SA-031H / SA-031I / SA-031J / SA-031K / SA-031L + CR-005 / CR-006 |
| **Two parallel peer onboarding paths.** Path A (Invite-driven): SA emails tokenized link → peer fills self-onboarding form → state = Pending Admin Review → SA approves → state = Pending Credentialing. Path B (SA-initiated): SA directly enters data via manual form (SA-022) or AI form upload (SA-075) → state = Pending Credentialing in one step (implicit admin approval). Both paths converge at **Pending Credentialing**; from the Credentialer's perspective, a Path A peer and a Path B peer are indistinguishable. | May 2026 | Path A: SA-031A / SA-031B / SA-031C / SA-031D. Path B: SA-022 / SA-075 / SA-031E. |
| **5 canonical report types** with persona-visibility matrix. Type 1: Per-Provider Review Answers (Reviewer own ✅, SA all, Client own). Types 2–5: Question Analytics / Specialty Highlights / Provider Highlights / Quality Certificate (SA all, Client own, Reviewer blocked). All reports scoped to a Review Cadence period (date pickers snap to cadence labels like "Q4 2025", not arbitrary dates). Strict cross-tenant isolation enforced server-side. | May 2026 | SA-013A / SA-013B / SA-013C / SA-013D / SA-013E + PR-040 + CL-013A (and baseline SA-013..016 / CL-009..012) |
| **Default-based scoring math.** Per-question score = 100% if reviewer selects the question's configured **default answer**; 0% if reviewer selects any non-default, non-NA answer; question is **excluded** entirely if reviewer selects NA. Review-level score = sum / count of scored questions (NA dropped from denominator). Same engine for Yes/No/NA and A/B/C/NA forms — A/B/C/NA does NOT use weighted scoring (A=3, B=2, C=1); it uses default-based 100/0/excluded. Pass/Fail is a separate engine producing binary outcome with threshold rule. | May 2026 | SA-127 / SA-127A / SA-127B / SA-127C / SA-128 / SA-129 |
| **Form-level Scoring System + per-question Default Answer (resolved).** A form's Scoring System (Yes/No/NA, A/B/C/NA, or Pass/Fail) is set at form level. Within a Yes/No/NA or A/B/C/NA form, EACH question can have a different default answer. Computation rule is the same default-based math regardless. Form level decides option-set + computation method; question level decides which option counts as "correct" for that specific question. Resolves the earlier open question. | May 2026 | SA-044 / SA-045 / SA-127 / SA-127A |
| **Capacity rule canonical:** `free slots = Max Case Assignment − current load`. `current load` = Assigned + In-Progress only. Excludes: Completed (frees capacity on submit), Returned-by-Peer (frees on kick-back), and Suggested-but-not-yet-approved (doesn't consume capacity). Lowering Max while load > Max keeps existing assignments but blocks new ones until load drops below the new Max. Applies uniformly to AI suggestions, manual assignment dropdowns, and bulk assignment. | May 2026 | SA-073 / SA-074 / SA-074A / SA-067A / SA-067I |
| **Reviewer / Peer Scorecard.** Distinct from the existing Provider Scorecard (SA-096, which scores the doctor) and the Earnings Report (SA-026, which is financial only). Six metric tiles per cadence period: (1) Volume, (2) Turnaround time + on-time %, (3) Quality / accuracy vs consensus or supervisor spot-checks, (4) Kick-back rate (PR-030 self-unassigns), (5) Specialty mix actually reviewed, (6) Earnings summary (read-only echo of SA-026). Trend view: current vs prior 2-3 cadence periods. Persona access: SA all, Reviewer own (read-only), Client blocked, Credentialer not exposed. | May 2026 | SA-096A / PR-041 |
| **License expiry: cadence + auto-reassignment.** Notification cadence simplified to **14 / 7 / 3 / 1 days + post-expiry** (replaces earlier 60/30/15/7/3/1 plan — 60-day lead was too noisy). On expiry, peer state auto-transitions to **License Expired**; in-progress cases assigned to that peer are **automatically reassigned** to the next available eligible peer (specialty match, license valid, capacity available). Reassignment uses the SA-067I split rule when no single peer can absorb all cases. Super Admin receives an alert email listing each reassigned case with original peer + new peer. If no eligible alternative exists, cases flagged "Needs Reassignment" for SA manual handling. Resolves the prior open question about in-progress cases on expiry. | May 2026 | SA-122 / SA-123 / CR-018 |
| **License renewal: state behavior depends on starting state.** Credentialer is responsible for updating new license validity. (a) If the peer was **License Expired** when the credentialer updates the expiry, state auto-transitions License Expired → Active and peer reappears in assignment selectors immediately. (b) If the peer was **already Active** (early renewal), the update is a metadata change only — state stays Active, no state machinery runs. The state machine only triggers when crossing a state boundary. | May 2026 | CR-017 / SA-031H (canonical) — supersedes CR-012 / SA-124 |
| **Drill-down rule (canonical, platform-wide).** Every numeric widget on every dashboard — counts, status circles, KPI tiles, percentages — must be clickable and navigate to a drill-down page showing the exact records that contribute to that number. Drill-down count must equal the widget number (no off-by-one, no silent filter mismatch). 0-count widgets navigate to an empty-state page (not a dead click). Percentage tiles drill into the underlying counted records with numerator/denominator visible. Applies to current and future dashboard widgets across all personas. | May 2026 | AU-016 (canonical) + SA-002 / CL-038 / PR-002 / CR-003 (per-persona instances) |
