# Client — Test Cases

> Persona: Medical clinic (FQHC) user. Tests assume Super Admin sheet seeded a test company with at least 1 doctor and 1 published form.

---


## Dashboard

### CL-001 — Client Dashboard loads with all widgets

**Module:** Dashboard | **Priority:** High

**Pre-conditions:** Logged in as Client.

**Steps:**
1. Land on Dashboard.

**Test Data:** _(none)_

**Expected Result:** Average Score donut chart, tabs (All / Complete / Unassigned), review list with score badges & reviewer names, Create A Report widget right, Recent Files widget right.

---

### CL-002 — Average Score donut shows correct percentage

**Module:** Dashboard | **Priority:** High

**Pre-conditions:** Client has completed reviews.

**Steps:**
1. Note donut value.
2. Manually compute average of all visible review scores.
3. Compare.

**Test Data:** _(none)_

**Expected Result:** Donut % matches manual average (within 1% rounding).

---

### CL-003 — Tab switching filters reviews

**Module:** Dashboard | **Priority:** Medium

**Pre-conditions:** Mix of complete and unassigned reviews.

**Steps:**
1. Click All tab → note count.
2. Click Complete tab.
3. Click Unassigned tab.

**Test Data:** _(none)_

**Expected Result:** Each tab shows only items in that state. Counts add up to All total.

---

### CL-004 — Score badges color-coded correctly

**Module:** Dashboard | **Priority:** Medium

**Pre-conditions:** Reviews with varied scores exist.

**Steps:**
1. Inspect badges on review list.

**Test Data:** _(none)_

**Expected Result:** ≥90% green, 80–89% yellow, <80% orange. Consistent across the app.

---

### CL-005 — Recent Files widget shows last uploads

**Module:** Dashboard | **Priority:** Medium

**Pre-conditions:** Client has uploaded files recently.

**Steps:**
1. Inspect Recent Files.

**Test Data:** _(none)_

**Expected Result:** Lists most recent file batches first. Clicking a file opens preview/download.

---

### CL-006 — Create A Report widget shortcut links work

**Module:** Dashboard | **Priority:** Medium

**Pre-conditions:** —

**Steps:**
1. Click a quick link (e.g., a provider's name).
2. Observe.

**Test Data:** _(none)_

**Expected Result:** Navigates to Reports page with the provider/quarter pre-filled.

---


## Reviews

### CL-007 — Reviews list shows all reviews for THIS client only

**Module:** Reviews | **Priority:** High

**Pre-conditions:** Multiple clients exist with reviews.

**Steps:**
1. Click Reviews in sidebar.
2. Inspect list.

**Test Data:** _(none)_

**Expected Result:** List shows only this client's reviews. Pagination works. No data from other companies leaked.

---

### CL-008 — Open completed review detail

**Module:** Reviews | **Priority:** Medium

**Pre-conditions:** —

**Steps:**
1. Click a completed review row.

**Test Data:** _(none)_

**Expected Result:** Detail view shows form questions, peer's answers, comments, score. Patient name should be redacted (or visible per company policy — verify with PM).

---


## Reports

### CL-009 — Generate Provider Highlights report

**Module:** Reports | **Priority:** High

**Pre-conditions:** —

**Steps:**
1. Click Reports.
2. Select Provider Highlights.
3. Pick date range.
4. Generate.

**Test Data:** _(none)_

**Expected Result:** PDF downloads. Contains only this client's providers and scores.

**Notes:** Client-side baseline. SA-013D is the canonical test (cross-persona); CL-013A covers cross-tenant isolation explicitly.

---

### CL-010 — Generate Specialty Highlights report

**Module:** Reports | **Priority:** High

**Pre-conditions:** —

**Steps:**
1. Reports → Specialty Highlights.
2. Date range.
3. Generate.

**Test Data:** _(none)_

**Expected Result:** PDF generated with specialty breakdown for this client only.

**Notes:** Client-side baseline. SA-013C is the canonical test.

---

### CL-011 — Generate Question Analytics report

**Module:** Reports | **Priority:** High

**Pre-conditions:** —

**Steps:**
1. Reports → Question Analytics.
2. Pick a specialty (e.g., Family).
3. Date range.
4. Generate.

**Test Data:** _(none)_

**Expected Result:** PDF shows question-by-question Yes/No/NA percentages.

**Notes:** Client-side baseline. SA-013B is the canonical test.

---

### CL-012 — Download Quality Certificate

**Module:** Reports | **Priority:** High

**Pre-conditions:** —

**Steps:**
1. Reports → Quality Certificate.
2. Pick quarter.
3. Generate.

**Test Data:** _(none)_

**Expected Result:** Certificate PDF downloads. Contains client's name, period, registration number.

**Notes:** Client-side baseline. SA-013E is the canonical test (includes print path).

---

### CL-013 — Client cannot see another client's data

**Module:** Reports | **Priority:** Critical

**Pre-conditions:** Two clients in system.

**Steps:**
1. Try to manipulate URL or filters to view Other Client's report.

**Test Data:** _(none)_

**Expected Result:** Server rejects. Data isolation is strict. CRITICAL security test.

---

### CL-013A — Cross-tenant isolation across all 5 report types

**Module:** Reports | **Priority:** Critical

**Pre-conditions:** Two clients in the system: Client X (Upper Great Lakes Family Health Center) and Client Y (a different company). Each has reviews and reports generated.

**Steps:**
1. Login as Client X.
2. Try each of the 5 report types and verify only Client X data is shown.
3. Attempt URL / parameter manipulation for each report type to access Client Y data:
   - Type 1: open a Client Y per-provider review PDF URL.
   - Type 2: change company parameter to Client Y on Question Analytics.
   - Type 3: same for Specialty Highlights.
   - Type 4: same for Provider Highlights.
   - Type 5: same for Quality Certificate.
4. Repeat the parameter manipulation against API endpoints (not just UI).

**Expected Result:** Every cross-tenant attempt returns 403 / not found. No data leakage. No partial leak (e.g., listing Client Y provider names without scores). Server enforces — cannot rely on client-side filtering.

**Notes:** Strengthens CL-013 by spelling out the matrix per report type. Critical security test. Pairs with the 5 canonical report tests SA-013A..SA-013E in SuperAdmin.md.

---


## Files

### CL-014 — Files page lists all client's uploaded batches

**Module:** Files | **Priority:** High

**Pre-conditions:** Client has uploaded files.

**Steps:**
1. Click Files in sidebar.

**Test Data:** _(none)_

**Expected Result:** All batches shown with batch name, upload date, doctor, form, status, expiration countdown.

---

### CL-015 — Click batch to view individual files

**Module:** Files | **Priority:** Medium

**Pre-conditions:** Batch exists.

**Steps:**
1. Click batch row.

**Test Data:** _(none)_

**Expected Result:** Drills into file list (e.g., Reichert 1.pdf, Reichert 2.pdf, ...). Each file is downloadable.

---

### CL-016 — Expired files indicator shown

**Module:** Files | **Priority:** Medium

**Pre-conditions:** Batch past expiration.

**Steps:**
1. Inspect expired batches.

**Test Data:** _(none)_

**Expected Result:** Expired batches show 'Expired' badge or are greyed out. Files not downloadable.

---


## Upload File

### CL-017 — Upload a new batch as Client (Batch Name + Doctor + Form auto-fill from AI)

**Module:** Upload File | **Priority:** Critical

**Pre-conditions:** Client has Review Cadence configured (per SA-063A/B/C). Today's date sits in a known cadence period (e.g., "Q2 2026" for FY-Jan Quarterly). At least 1 doctor and 1 published form exist for the client.

**Steps:**
1. Click Upload File.
2. Leave **Batch Name** blank (AI will auto-fill from cadence).
3. Leave **Doctor** blank (AI will auto-extract per file).
4. Leave **Form** blank (AI will auto-select per file from published forms).
5. (Optional) Pick an existing Global ad-hoc tag — leave the cadence tag slot blank so it auto-applies.
6. Drag/drop 3 PDFs.
7. Submit.
8. Wait for AI extraction to complete.
9. Re-open the batch; inspect the Batch Name field.
10. Edit the Batch Name (e.g., to "May Audit Run") and save.
11. Reload and confirm the override persists.

**Test Data:** 3 PDF files. Active client = the logged-in client account.

**Expected Result:**
- Batch uploaded; appears in Files list and on the Super Admin side as a new-batch notification awaiting assignment.
- After AI extraction: **Batch Name auto-populated with the client's current cadence label** (e.g., "Q2 2026"). Doctor and Form auto-populated per file from chart content.
- Manual override of Batch Name (Step 10) saves and persists. Per-file cadence tags remain attached (the renamed batch is still associated with the cadence period — see SA-063D).
- If AI cannot confidently match Doctor or Form on a file, that file is flagged "needs review" rather than blocking the whole batch.

**Notes:** Updated May 2026 — Batch Name and AI-populated fields follow the same model as SA-063 / SA-063E / SA-063G / SA-063H on the Super Admin side. Client experience mirrors SA experience.

---

### CL-018 — Required fields enforced on upload (Client-side)

**Module:** Upload File | **Priority:** High

**Pre-conditions:** Client has Review Cadence configured. At least 1 published form exists.

**Steps:**
1. Try Submit with no files attached (leave Batch Name auto-filled).
2. Try with a file attached but Batch Name explicitly cleared (auto-filled value deleted by user).
3. Upload a poor-scan chart where AI cannot confidently extract Doctor. Submit.
4. Upload a chart whose specialty has no published form. Submit.

**Test Data:** _(none)_

**Expected Result:**
- Step 1: blocked — at least 1 file required. Inline validation error visible.
- Step 2: either blocked OR Batch Name auto-fills from cadence again on save (confirm rule with PM — recommended: re-fill rather than block).
- Step 3: submission succeeds; file flagged "needs review — Doctor" so SA can resolve before assignment.
- Step 4: submission succeeds; file flagged "needs review — Form" so SA can pick the form manually.
- Hard-required at submit: **at least 1 file**. Batch Name, Doctor, Form are AI-populated and flagged for manual review when AI cannot fill them.

**Notes:** Updated May 2026 — mirrors SA-064 on the Super Admin side. Old model (manual Batch Name / Doctor / Form required) replaced with AI auto-fill + needs-review fallback.

---

### CL-019 — Multi-file drag and drop works

**Module:** Upload File | **Priority:** Medium

**Pre-conditions:** —

**Steps:**
1. Drag 5 PDFs at once into upload area.

**Test Data:** _(none)_

**Expected Result:** All 5 files queue up in upload list. Each shows progress. All complete successfully.

---

### CL-020 — Large file size handled gracefully

**Module:** Upload File | **Priority:** Medium

**Pre-conditions:** —

**Steps:**
1. Try to upload a very large PDF (e.g., 50MB).

**Test Data:** _(none)_

**Expected Result:** Either uploads successfully OR shows clear size limit error message. No silent failure.

---


## Profile

### CL-021 — Profile page loads with all sections

**Module:** Profile | **Priority:** Medium

**Pre-conditions:** —

**Steps:**
1. Click Profile.

**Test Data:** _(none)_

**Expected Result:** Sections: General Settings (Avatar, Practice Name, Main Contact Email), Reset Password, Support Questions, Add Doctors, Add Locations.

---

### CL-022 — Update practice name and contact email

**Module:** Profile | **Priority:** Medium

**Pre-conditions:** —

**Steps:**
1. Edit Name of Practice and Main Contact Email.
2. Save Changes.

**Test Data:** _(none)_

**Expected Result:** Saved. Login email for client may or may not update — verify behavior with PM.

---

### CL-023 — Upload avatar

**Module:** Profile | **Priority:** Medium

**Pre-conditions:** —

**Steps:**
1. Click Upload Avatar.
2. Select an image (PNG/JPG).
3. Save.

**Test Data:** _(none)_

**Expected Result:** Avatar updates. Visible in sidebar/header.

---

### CL-024 — Reset own password

**Module:** Profile | **Priority:** High

**Pre-conditions:** —

**Steps:**
1. Open Reset Password section.
2. Enter current password.
3. Enter new password and confirm.
4. Save.

**Test Data:** _(none)_

**Expected Result:** Password updated. Logout and re-login with new password works.

---

### CL-025 — Add Doctor from Profile

**Module:** Profile | **Priority:** Medium

**Pre-conditions:** —

**Steps:**
1. Open Add Doctors.
2. Enter Name, Credentials, Specialty.
3. Save.

**Test Data:** _(none)_

**Expected Result:** Doctor added. Appears in Doctor dropdown when uploading files.

---

### CL-026 — Add Location from Profile

**Module:** Profile | **Priority:** Medium

**Pre-conditions:** —

**Steps:**
1. Open Add Locations.
2. Enter Location Name and address.
3. Save.

**Test Data:** _(none)_

**Expected Result:** Location added and selectable in filters.

---

### CL-027 — Submit a Support Question

**Module:** Profile | **Priority:** Medium

**Pre-conditions:** —

**Steps:**
1. Open Support Questions.
2. Type a message.
3. Submit.

**Test Data:** _(none)_

**Expected Result:** Confirmation toast. Super Admin should see this submission in their support inbox.

---


## Forms

### CL-028 — Client can view forms (read-only)

**Module:** Forms | **Priority:** Low

**Pre-conditions:** —

**Steps:**
1. Click Forms in sidebar.

**Test Data:** _(none)_

**Expected Result:** Forms relevant to this client visible (read-only or with limited edit per requirements). Confirm permission model with PM.

---


## Invoices (Client)

### CL-029 — Client can view and download own invoices

**Module:** Invoices (Client) | **Priority:** Critical

**Pre-conditions:** Super Admin has generated an invoice for this client.

**Steps:**
1. Look for Invoices in sidebar OR within Reports/Profile.
2. Click invoice → Download PDF.

**Test Data:** _(none)_

**Expected Result:** Invoice PDF downloads. Total matches what was generated by admin. Itemized review list available.

---

### CL-030 — Email notification for new invoice

**Module:** Invoices (Client) | **Priority:** High

**Pre-conditions:** Notification system enabled. Super Admin generates a new invoice for client.

**Steps:**
1. Generate invoice from admin side.
2. Check client's inbox.

**Test Data:** _(none)_

**Expected Result:** Email arrives stating 'Your invoice is now ready' with a link back to the portal. Email body does NOT contain itemized PHI.

---


## NEW TEST CASES BELOW — Added from May 2026 review of meeting docs


## Dashboard — CMO/Client Enhanced View (from review)

### CL-031 — Quick Snapshot status visible at top of dashboard

**Module:** Dashboard | **Priority:** High

**Pre-conditions:** Logged in as Client. Reviews exist for current quarter.

**Steps:**
1. Open Dashboard.
2. Locate quick-status banner.

**Test Data:** _(none)_

**Expected Result:** Banner shows e.g. "87% complete on Q4 reviews" — the quick line a CMO can read in 2 seconds during a phone call.

---

### CL-032 — Compliance by Specialty (color-coded) widget

**Module:** Dashboard | **Priority:** High

**Pre-conditions:** Multiple specialties have reviews in the current quarter.

**Steps:**
1. View dashboard Compliance by Specialty section.

**Test Data:** _(none)_

**Expected Result:** Each specialty shown with a score and color-coded indicator (e.g., A=green, B=yellow, C=orange/red).

---

### CL-033 — Risk Distribution widget (high / medium / low)

**Module:** Dashboard | **Priority:** High

**Pre-conditions:** Reviews completed with risk flags.

**Steps:**
1. View Risk Distribution chart on dashboard.

**Test Data:** _(none)_

**Expected Result:** Chart breaks down reviews by risk level (high/medium/low). Numbers are clickable to see the underlying records.

---

### CL-034 — Past Due Cases counter from Peerspectiv

**Module:** Dashboard | **Priority:** High

**Pre-conditions:** At least one review is past the SLA from Peerspectiv's side.

**Steps:**
1. View Past Due section.

**Test Data:** _(none)_

**Expected Result:** Counter shows count of past-due cases (Peerspectiv-side delays only — not client-side). Click drills down to list.

---

### CL-035 — Open Corrective Actions section

**Module:** Dashboard | **Priority:** High

**Pre-conditions:** Corrective actions exist for the company.

**Steps:**
1. Open dashboard.
2. Locate Open Corrective Actions widget.

**Test Data:** _(none)_

**Expected Result:** Widget lists open corrective actions with provider, criteria missed, and recommended next step (sourced from UpToDate or AI per Req 2).

---

### CL-036 — AI-Generated Trends / Insights panel

**Module:** Dashboard | **Priority:** Medium

**Pre-conditions:** Multiple quarters of review data exist.

**Steps:**
1. View Trends panel on dashboard.

**Test Data:** _(none)_

**Expected Result:** Panel shows AI-generated insights labeled Positive / Warning / Urgent, with brief explanatory text. Filterable by specialty.

---

### CL-037 — Provider list — search and filter

**Module:** Dashboard | **Priority:** Medium

**Pre-conditions:** Company has many providers with varied scores.

**Steps:**
1. Go to Provider list section on dashboard.
2. Apply filter: score < 70%.
3. Use search to find a provider by name.

**Test Data:** _(none)_

**Expected Result:** Filter narrows to providers below 70%. Search finds providers by partial name match.

---

### CL-038 — Click-through drill-down on every Client dashboard widget

**Module:** Dashboard | **Priority:** High

**Pre-conditions:** Client dashboard with multiple numeric widgets populated (Past Due, In Progress, Total Reviews, Score %, Tabs).

**Steps:**
1. Click the count on **Past Due** widget.
2. Verify drill-down list shows exactly that many past-due records.
3. Repeat for **In Progress**, **Total Reviews**, and any other count widget.
4. Click the **Score %** tile (e.g., "92%").
5. Verify drill-down shows the underlying counted reviews with both numerator and denominator visible.
6. Test a 0-count widget — clicking should navigate to an empty-state page, not a dead click.

**Test Data:** _(none)_

**Expected Result:**
- Every numeric widget on the Client dashboard is clickable and navigates to a drill-down listing the contributing records.
- Drill-down record count exactly matches the widget number (no off-by-one).
- Records are filterable and exportable.
- Percentage tiles drill into the underlying records with numerator/denominator visible.
- 0-count widgets navigate to an empty state ("No items"), not a dead click.

**Notes:** Aligned with the platform-wide drill-down rule (AU-016).

---

### CL-039 — Quarter-over-Quarter score comparison

**Module:** Dashboard | **Priority:** Medium

**Pre-conditions:** Provider has scores in at least 3 quarters.

**Steps:**
1. Open provider drill-down.

**Test Data:** _(none)_

**Expected Result:** Provider detail shows current quarter score plus previous 2-3 quarters for comparison.

---


## Reports — Client Enhanced (from review)

### CL-040 — Provider Scorecard PDF in landscape orientation

**Module:** Reports | **Priority:** Medium

**Pre-conditions:** Provider with reviews exists.

**Steps:**
1. Generate Provider Scorecard PDF.

**Test Data:** _(none)_

**Expected Result:** PDF is in landscape. Easier to read than current portrait. Layout legible at 100% zoom.

---

### CL-041 — Download All — zip export of quarterly deliverables

**Module:** Reports | **Priority:** Medium

**Pre-conditions:** Quarter has completed reviews.

**Steps:**
1. Reports > select quarter > Download All.
2. Open the zip.

**Test Data:** _(none)_

**Expected Result:** Zip contains: completed peer reviews folder, corrective action plans folder, quality certificate, summary reports.

---


## Feedback (from review)

### CL-042 — Client Feedback widget submits ratings

**Module:** Feedback | **Priority:** Low

**Pre-conditions:** Logged in as Client.

**Steps:**
1. Locate Share Feedback widget.
2. Rate Satisfaction, Turnaround Time, Quality of Reviews.
3. Answer "Would you recommend us?".
4. Submit.

**Test Data:** _(none)_

**Expected Result:** Submission saved. Super Admin can see aggregated client feedback.

---


## USER FEEDBACK May 2026 — MRN Identification (NR-009 RESCOPED)

> **Confirmed with Ashton (May 2026):** The original "blind review / patient name redaction" requirement (NR-009) has been **rescoped**. There is no PHI redaction pipeline to build. Instead, the underlying need is: when a reviewer reviews a chart, they must record **which patient/chart** the provider was seeing. We can't use patient name (some clients require redaction at the source). So the chart's **MRN** is used as the identifier — every chart has one. The reviewer enters MRN manually, or AI auto-fills from the chart. Coverage moved to the **Peer/Reviewer** sheet (PR-028..PR-029, plus new PR-035..PR-038). Nothing further needed in the Client portal — this is a reviewer-side identifier, not a client-portal display feature.

---
