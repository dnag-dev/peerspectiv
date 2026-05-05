# Peer / Reviewer — Test Cases

> Persona: Licensed medical professional. Tests assume Super Admin assigned at least 2 batches (1 to leave incomplete, 1 to fully complete) to this peer.

---


## Dashboard

### PR-001 — Peer Dashboard loads with status circles

**Module:** Dashboard | **Priority:** High

**Pre-conditions:** Logged in as Peer.

**Steps:**
1. Land on Dashboard.

**Test Data:** _(none)_

**Expected Result:** Greeting. 3 status circles: Completed / In-Progress / Incomplete with counts. Tabs: All / Complete / Incomplete. Assignment table with columns: Review Form name, Doctor, Date Assigned, Date Completed, Status.

---

### PR-002 — Status circle counts match assignments AND drill-down works

**Module:** Dashboard | **Priority:** High

**Pre-conditions:** Mix of statuses on the peer's dashboard.

**Steps:**
1. Note the 3 status-circle counts: Completed / In-Progress / Incomplete.
2. Manually count rows per status across pages.
3. Verify counts match the circles.
4. Click directly on the **Completed** circle number.
5. Click directly on the **In-Progress** circle number.
6. Click directly on the **Incomplete** circle number.

**Test Data:** _(none)_

**Expected Result:** Numbers match exactly. Clicking each status circle navigates to a drill-down page pre-filtered by that status and listing the cases that compose that count. Drill-down count equals the circle number. Per the platform rule (AU-016), this applies to every numeric dashboard widget.

**Notes:** Updated May 2026 — matches the platform-wide drill-down rule (AU-016).

---

### PR-003 — Tab filters review list

**Module:** Dashboard | **Priority:** Medium

**Pre-conditions:** —

**Steps:**
1. Click Complete tab.
2. Click Incomplete tab.
3. Click All tab.

**Test Data:** _(none)_

**Expected Result:** List filters correctly each time.

---

### PR-004 — Color-coded status badges

**Module:** Dashboard | **Priority:** Low

**Pre-conditions:** —

**Steps:**
1. Inspect status badges on each row.

**Test Data:** _(none)_

**Expected Result:** Complete = green. Other statuses use distinct colors. Consistent across pages.

---

### PR-005 — Pagination across many assignments (no need to click 100 cases one-by-one)

**Module:** Dashboard | **Priority:** Medium

**Pre-conditions:** Peer with 100+ assignments (per requirements).

**Steps:**
1. Scroll/paginate through assignments.
2. Look for sort/filter/search to find a specific case quickly.

**Test Data:** _(none)_

**Expected Result:** Per Ashton's feedback: a peer should NOT have to click each one to find the next. Sort, filter, search, or 'Next un-reviewed' button should be available.

---


## Conduct Review

### PR-006 — Open a review in split-screen

**Module:** Conduct Review | **Priority:** Critical

**Pre-conditions:** At least 1 incomplete assignment exists.

**Steps:**
1. Click an incomplete assignment row to open review.

**Test Data:** _(none)_

**Expected Result:** Split-screen layout: left = patient medical record (PDF viewer with allergies, ROS, labs, etc.), right = review form. Both panes scrollable independently.

---

### PR-007 — PDF viewer renders the medical record

**Module:** Conduct Review | **Priority:** Critical

**Pre-conditions:** Review opened.

**Steps:**
1. Inspect left pane.
2. Scroll the PDF.
3. Zoom in/out.

**Test Data:** _(none)_

**Expected Result:** PDF renders fully. Pages navigable. Zoom works. Text legible.

---

### PR-008 — Answer Yes/No/NA for all questions

**Module:** Conduct Review | **Priority:** Critical

**Pre-conditions:** Review form has Yes/No/NA fields.

**Steps:**
1. Click Yes for question 1.
2. Click No for question 2 → if 'require additional response on No' is on, the comment box appears.
3. Type comment text.
4. Click NA for question 3.
5. Continue for all questions.

**Test Data:** _(none)_

**Expected Result:** Each radio selection registers. Conditional comment appears for No answers. NA selectable. No console errors.

---

### PR-009 — Final 'Complies with Standards of Care?' question works

**Module:** Conduct Review | **Priority:** High

**Pre-conditions:** Form has the final question.

**Steps:**
1. Select Yes (or No / NA).

**Test Data:** _(none)_

**Expected Result:** Selection saved. If No → comments field becomes mandatory.

---

### PR-010 — Comments and Recommendations field accepts free text

**Module:** Conduct Review | **Priority:** High

**Pre-conditions:** —

**Steps:**
1. Type ~500 characters of feedback.
2. Tab away.

**Test Data:** _(none)_

**Expected Result:** Text saved in field. No truncation.

---

### PR-011 — Reviewer name and license number field

**Module:** Conduct Review | **Priority:** High

**Pre-conditions:** —

**Steps:**
1. Type your name and license number into the field.

**Test Data:** _(none)_

**Expected Result:** Field accepts text. (Future: this could autofill from Peer profile — flag if it doesn't.)

---

### PR-012 — Submit Review computes score correctly

**Module:** Conduct Review | **Priority:** Critical

**Pre-conditions:** Form fully answered: e.g., 8 Yes, 1 No, 1 NA out of 10 questions.

**Steps:**
1. Click Submit Review.
2. Note returned score.

**Test Data:** _(none)_

**Expected Result:** Score = (Correct Answers / Total Questions - NA) × 100 = 8 / 9 × 100 ≈ 88.89% (or 89%). Verify against rule from requirements.

---

### PR-013 — Submit blocked if Required fields empty

**Module:** Conduct Review | **Priority:** Critical

**Pre-conditions:** Form has Required fields.

**Steps:**
1. Leave a Required field blank.
2. Click Submit.

**Test Data:** _(none)_

**Expected Result:** Submit blocked with inline error: 'This field is required.' Review NOT submitted; status remains Incomplete.

---

### PR-014 — Save & Exit preserves work

**Module:** Conduct Review | **Priority:** High

**Pre-conditions:** Review partially filled.

**Steps:**
1. Answer 3 of 10 questions.
2. Click Save & Exit.
3. Return to Dashboard.
4. Reopen the same review.

**Test Data:** _(none)_

**Expected Result:** Previously answered 3 questions are still selected. No data lost.

---

### PR-015 — Review duration tracked

**Module:** Conduct Review | **Priority:** Medium

**Pre-conditions:** —

**Steps:**
1. Open review at known time T1.
2. After ~3 minutes, click Submit.
3. Check Duration in Peer Profile → Assigned Reviews.

**Test Data:** _(none)_

**Expected Result:** Duration shows ~3:00 (m:s).

---

### PR-016 — Completed review locked from edit

**Module:** Conduct Review | **Priority:** High

**Pre-conditions:** Review already submitted.

**Steps:**
1. Try to reopen and edit a Completed review.

**Test Data:** _(none)_

**Expected Result:** Review is read-only OR not openable for editing. Score and answers immutable.

---

### PR-017 — _RETIRED — see PR-028 / PR-029 / PR-035..PR-038 for MRN-based identification_

**Module:** Conduct Review | **Priority:** —

**Pre-conditions:** —

**Steps:** Originally tested PHI / patient-name redaction in the medical record viewer (the "blind review" concept). Confirmed with Ashton (May 2026) that the actual requirement is MRN-based chart identification, NOT redaction. There is no redaction pipeline to build. See PR-028 (MRN auto-populated), PR-029 (manual MRN entry), and PR-035..PR-038 below for the full rescoped coverage.

**Test Data:** _(none)_

**Expected Result:** _Test retired — do not run._

**Notes:** RETIRED — kept as a placeholder so test IDs don't shift. NR-009 was rescoped, not deleted.

---


## Profile

### PR-018 — Peer Profile loads with General + Reset Password + Assigned Reviews

**Module:** Profile | **Priority:** Medium

**Pre-conditions:** —

**Steps:**
1. Click Profile.

**Test Data:** _(none)_

**Expected Result:** 3 sections accessible. Avatar, name, license info shown.

---

### PR-019 — Reset own password

**Module:** Profile | **Priority:** High

**Pre-conditions:** —

**Steps:**
1. Reset Password → enter current + new + confirm.
2. Save.

**Test Data:** _(none)_

**Expected Result:** Password updated. Re-login with new password succeeds.

---

### PR-020 — Generate Earnings Report from peer's own profile

**Module:** Profile | **Priority:** Medium

**Pre-conditions:** Peer has completed reviews.

**Steps:**
1. Click Generate Earnings Report.
2. Set Price Per Review and date range.
3. Generate.

**Test Data:** _(none)_

**Expected Result:** Earnings PDF/summary generated. (Verify whether peers should have access to this OR if it's admin-only — per requirements.)

---


## NEW TEST CASES BELOW — Added from May 2026 review of meeting docs


## Conduct Review — AI-Assisted (from review)

### PR-021 — AI Chart Summary displays on Start Review

**Module:** Conduct Review | **Priority:** High

**Pre-conditions:** Logged in as Peer with at least 1 assignment.

**Steps:**
1. Open an assignment.
2. Click Start Review.
3. Locate Chart Summary panel.

**Test Data:** _(none)_

**Expected Result:** AI-generated summary of the medical record displays in a panel. Risk flags shown (high/medium/low) where applicable.

---

### PR-022 — Multiple charts listed (Chart 1, 2, 3) for the same provider

**Module:** Conduct Review | **Priority:** Medium

**Pre-conditions:** Reviewer has been assigned 3 charts for a single provider.

**Steps:**
1. Open the provider's review session.
2. Inspect chart navigation.

**Test Data:** _(none)_

**Expected Result:** Charts are listed as Chart 1, Chart 2, Chart 3. Clicking a chart loads its summary + medical record. Patient names not shown in chart navigator (use chart # only or MRN).

---

### PR-023 — AI auto-populates Yes/No/NA answers (override-able)

**Module:** Conduct Review | **Priority:** High

**Pre-conditions:** Feature toggle ON in admin settings.

**Steps:**
1. Open a review.
2. Observe pre-filled answers in the form.
3. Override one answer.
4. Submit.

**Test Data:** _(none)_

**Expected Result:** AI pre-populates answers based on chart content. Reviewer can override any answer. Submission honors the reviewer's final values, not the AI defaults.

---

### PR-024 — AI-generated Comments and Recommendations suggestion

**Module:** Conduct Review | **Priority:** Medium

**Pre-conditions:** Reviewer is on the review form with the Comments field visible.

**Steps:**
1. Click Suggest / AI button next to Comments field.
2. Inspect generated text.
3. Edit and submit.

**Test Data:** _(none)_

**Expected Result:** AI proposes comment text based on the chart and the answers given. Reviewer can edit before submitting.

---

### PR-025 — Hover over question highlights related section in medical chart

**Module:** Conduct Review | **Priority:** Medium

**Pre-conditions:** Feature toggle ON. Review in progress.

**Steps:**
1. Hover over a form question (e.g., "Was the allergy list reviewed?").
2. Observe the medical record panel.

**Test Data:** _(none)_

**Expected Result:** Medical record auto-scrolls to the Allergies section and highlights it. Speeds up review.

---

### PR-026 — Reviewer can toggle hover-highlighting OFF

**Module:** Conduct Review | **Priority:** Low

**Pre-conditions:** Hover-highlighting is on by default.

**Steps:**
1. In review settings (or per-session toggle), turn off hover-highlighting.
2. Hover over a question.

**Test Data:** _(none)_

**Expected Result:** Highlight does not trigger. Medical record stays at current scroll position. Setting persists for the session (or per user).

---


## Conduct Review — Form Enhancements (from review)

### PR-027 — Reviewer Attestation Box on every review

**Module:** Conduct Review | **Priority:** High

**Pre-conditions:** Reviewer is on review submission step.

**Steps:**
1. Inspect the bottom of the form.
2. Try to submit without checking the attestation box.

**Test Data:** _(none)_

**Expected Result:** Box reads (or similar): "I attest the above licenses current, good standing, and I personally performed this review." Submission blocked until checked.

---

### PR-028 — MRN field PRESENT and required on every review form

**Module:** Conduct Review | **Priority:** Critical

**Pre-conditions:** Reviewer is on a Conduct Review screen for any case.

**Steps:**
1. Open the review form.
2. Locate the MRN field on the form (alongside reviewer name and license number).
3. Try to submit with MRN blank.

**Test Data:** _(none)_

**Expected Result:** MRN field is present, clearly labeled, and required. Submit blocked with validation message when MRN is empty. Field placement: in the reviewer-attestation block, near reviewer name + license.

**Notes:** Confirmed with Ashton: MRN is the chart identifier (replaces patient name) — every chart has one. This is REQUIRED data per review. Form-side enforcement (system-rendered, cannot-modify) lives in SA-044 / SA-044B. Profile-driven autofills for Reviewer name + License live in PR-039.

---

### PR-029 — MRN AI auto-populated from chart when available

**Module:** Conduct Review | **Priority:** High

**Pre-conditions:** Chart PDF contains a parseable MRN (most cases). AI extraction enabled.

**Steps:**
1. Open the review form for a chart known to have an MRN.
2. Inspect the MRN field on form load.
3. Check that the auto-populated value matches the MRN visible in the chart PDF.

**Test Data:** Reference MRN from the chart PDF.

**Expected Result:** MRN field is pre-filled by AI on form load. Reviewer is not required to type it manually. Value matches the MRN in the source chart. Auto-populated value is editable (not locked) in case of OCR error.

**Notes:** Confirmed with Ashton: AI autofills, but reviewer can correct.

---

### PR-035 — Reviewer can MANUALLY enter MRN when AI cannot extract it

**Module:** Conduct Review | **Priority:** High

**Pre-conditions:** Chart where AI auto-extraction failed (poor scan / handwritten / no OCR layer).

**Steps:**
1. Open review form.
2. MRN field is empty (AI extraction failed — either no value or "Could not extract" indicator).
3. Locate MRN in the chart PDF manually.
4. Type the value into the MRN field.
5. Submit the review.

**Test Data:** Sample MRN value (e.g., "MRN-78421-A").

**Expected Result:** Manual entry saves. Submission accepts. MRN persists on the completed review record. No format-too-strict error blocking valid MRN formats (alphanumeric, hyphens).

---

### PR-036 — MRN can be CORRECTED if AI extracted wrong value

**Module:** Conduct Review | **Priority:** Medium

**Pre-conditions:** Chart where AI extracted MRN, but the value is wrong (test by deliberately checking on a known-mislabeled chart).

**Steps:**
1. Open review form.
2. Notice MRN field is auto-populated with an incorrect value.
3. Clear the field and type the correct MRN.
4. Submit.
5. Re-open the completed review.

**Expected Result:** Reviewer's correction overrides the AI value. Final saved MRN = the value the reviewer typed. Audit log captures both AI-suggested and reviewer-final values (if implemented).

---

### PR-037 — MRN displayed on completed review record (Super Admin + Client view)

**Module:** Conduct Review | **Priority:** High

**Pre-conditions:** Review submitted with MRN filled in (PR-028..PR-036).

**Steps:**
1. (SA) Open the completed review detail.
2. Locate MRN on the review summary.
3. (Client) Login as the relevant client. Open the same review (if visible to client).
4. Locate MRN on the client's view of the review.

**Expected Result:** MRN visible to both SA and Client wherever the completed review is shown. Client can use MRN to identify which chart was reviewed without needing patient name. MRN appears on Provider Highlights / Quality Certificate exports if Ashton confirms it should.

**Notes:** Confirm with Ashton whether MRN appears on the Quality Certificate PDF or only inside the platform.

---

### PR-038 — MRN field accepts standard formats; rejects clearly invalid input

**Module:** Conduct Review | **Priority:** Medium

**Pre-conditions:** Reviewer on Conduct Review screen.

**Steps:**
1. Try entering each of the following in the MRN field and submitting:
   - "12345" (numeric only)
   - "MRN-78421-A" (alphanumeric with hyphens)
   - "ABC123XYZ" (alphanumeric)
   - "" (blank)
   - "  " (whitespace only)
   - "<script>alert(1)</script>" (XSS attempt)
2. Inspect behavior of each.

**Expected Result:** Valid MRN formats (numeric, alphanumeric, with hyphens or underscores) accepted. Blank and whitespace-only rejected with required-field error. XSS / HTML stripped or escaped — never rendered.

**Notes:** Coordinate validation rules with what the chart-parsing AI produces, so AI-extracted values don't collide with strict client-side validation.

---

### PR-039 — Reviewer name + License number auto-populated from profile in attestation block

**Module:** Conduct Review | **Priority:** Critical

**Pre-conditions:** Logged-in reviewer has a complete profile (Name, License Number, License State, License Expiry — see SA-116 / SA-117). Reviewer is on a Conduct Review screen for any case using any form.

**Steps:**
1. Open the review form for a fresh case (first time loading).
2. Locate the system attestation block (rendered separately from the QA questions — see SA-044 / SA-044B).
3. Inspect the **Reviewer name** field — should auto-populate from the logged-in reviewer's profile.
4. Inspect the **License number** field — should auto-populate from the reviewer's profile.
5. Try to edit the Reviewer name field; try to edit the License number field. Verify behavior (locked vs. editable — confirm with PM).
6. Edit the reviewer's profile (Name = "Jane Smith MD", License = "TX-99999"). Save profile.
7. Open a new case (or refresh) and confirm the attestation block reflects the new profile values.
8. Submit a review.
9. Re-open the completed review and confirm the attestation block shows the values from the time of submission (not the current profile, in case the profile changed afterward).

**Test Data:** Use logged-in reviewer's actual profile data; then set Name to "Jane Smith MD", License to "TX-99999".

**Expected Result:**
- Reviewer name and License number auto-populate from the reviewer's profile on every form load.
- Reviewer is not asked to type these manually.
- Profile updates flow into subsequent reviews on next form load.
- Submitted reviews lock the values at submission time (audit integrity — a profile edit later cannot change historical reviews).
- Behavior consistent across forms — these fields render identically on every review regardless of form definition.

**Notes:** Confirmed with Ashton (May 2026): Reviewer name and License come from profile (auto-fill); MRN comes from AI chart-reading (auto-fill, reviewer can override — see PR-029 / PR-036). All three are part of the system attestation block, NOT the form schema. Pairs with SA-044 / SA-044B on the form-creation side.

---

### PR-030 — Peer SELF-UNASSIGNS a case with required reason (visible to SA)

**Module:** Conduct Review | **Priority:** High

**Pre-conditions:** Reviewer is on a case that was misassigned (e.g., labeled Family Medicine but the chart is OB-GYN, or labeled to Dr. X but they don't review for that company, or any reason).

**Steps:**
1. Open the assigned case to begin review.
2. Click "Unassign from Me" / "Request Reassignment" / "Kick Back" button on the review screen.
3. Try to submit without typing a reason.
4. Enter a reason: "This is an OB-GYN chart, not Family — please reassign to OB-GYN reviewer."
5. Submit.
6. Verify the case is removed from the peer's dashboard.
7. Verify the peer is NOT paid for this case (no review submitted).
8. (Switch context to SA) Open Assignments page. Filter by status "Returned by Peer" (or equivalent).
9. Locate the kicked-back case.
10. Verify the peer's reason text is visible on the case detail.

**Expected Result:**
- Reason field is required at submit. Empty submission blocked with validation error.
- Case status flips to "Returned by Peer" (or similar — distinct from Unassigned so SA knows a peer rejected it).
- Case returns to SA queue for review/reassignment.
- Peer's reason text is captured verbatim, visible to SA on the case detail screen and in the Assignments index page (per SA-067H).
- Peer is not penalized / not paid for the kicked-back case (consistent with payment rules — see Credentialer / payment tests).

**Notes:** Confirmed with Ashton (May 2026): peer self-unassign is real-world common (mismatched specialty, conflict of interest, scope of practice). The required comment helps SA improve future assignment accuracy and has audit value. Pairs with SA-067H (SA reviews kicked-back queue).

---


## —— NEW REQUIREMENTS (May 2026 — user feedback) ——

## Profile — Specialty & License Display (NEW)

### PR-031 — Peer profile DISPLAYS all assigned specialties (read-only multi)

**Module:** Profile | **Priority:** High

**Pre-conditions:** Super Admin assigned the peer multiple specialties (see SA-101).

**Steps:**
1. Login as peer.
2. Profile > General tab.
3. Locate Specialties section.

**Expected Result:** All specialties show as chips / tags. Read-only on peer side (only Super Admin / Credentialer can edit). Specialty list matches Super Admin Peers list view.

**Notes:** NEW REQUIREMENT — peer needs visibility into what they're matchable for.

---

### PR-032 — Peer dashboard shows ONLY assignments matching the peer's specialties

**Module:** Dashboard | **Priority:** Medium

**Pre-conditions:** Peer has specialties [Family Medicine, Pediatrics]. Cases assigned across various specialties — including some out-of-specialty by mistake.

**Steps:**
1. Login as peer.
2. Dashboard > review queue.
3. Verify each assigned case's specialty falls within peer's specialties.

**Expected Result:** Only in-specialty cases visible. (Confirm with Ashton whether out-of-specialty assignment is hard-blocked at the SA assignment step or just visually filtered on the peer side.)

**Notes:** NEW REQUIREMENT — confirm rule with PM.

---

### PR-033 — Peer profile DISPLAYS license number, state, issue date, expiry date

**Module:** Profile | **Priority:** High

**Pre-conditions:** SA-117 done (license dates on file).

**Steps:**
1. Login as peer.
2. Profile > General.
3. Locate License section.

**Expected Result:** License Number, State, Issue Date, Expiry Date all visible. Read-only on peer side. License document downloadable.

**Notes:** NEW REQUIREMENT — peer should be able to view (but not edit) own license metadata.

---

### PR-034 — Peer sees expiry warning on dashboard when own license is near expiry

**Module:** Dashboard | **Priority:** High

**Pre-conditions:** Peer's License Expiry Date < 60 days from today.

**Steps:**
1. Login as peer.
2. Dashboard.
3. Look for license-expiry banner / warning.

**Expected Result:** Visible, non-dismissible (or one-time dismissible per session) banner: "Your license expires in N days. Contact admin to renew." Cleared when license is renewed.

**Notes:** NEW REQUIREMENT.

---

## Reports — Per-Provider Review Answers (NEW)

### PR-040 — Reviewer accesses Per-Provider Review Answers PDF (own reviews only)

**Module:** Reports / Profile | **Priority:** High

**Pre-conditions:** Reviewer logged in. Has completed multiple reviews. Other reviewers have completed reviews on the same providers (so we can test cross-reviewer access).

**Steps:**
1. Login as reviewer.
2. Navigate to a section showing reviewer's completed reviews (Profile > Reviews / Dashboard > Completed tab).
3. Click any completed review.
4. Click "Generate PDF" / "Download Report".
5. Verify the PDF matches Report Type 1 (per SA-013A).
6. Try to access another reviewer's completed review by URL manipulation.
7. Try to access the Question Analytics, Specialty Highlights, Provider Highlights, or Quality Certificate report types via URL manipulation.

**Expected Result:**
- Reviewer can generate / download Report Type 1 for any review they personally completed.
- Reviewer cannot access another reviewer's review-answer PDF (server returns 403 / not found).
- Reviewer cannot access Report Types 2, 3, 4, or 5 — those URLs / endpoints return 403.

**Notes:** NEW — fills gap on the reviewer side. Per the persona matrix in SuperAdmin.md → Reports section, reviewer has access only to Report Type 1 and only for their own reviews.

---

### PR-041 — Reviewer accesses own Scorecard (read-only, six metrics)

**Module:** Reports / Profile | **Priority:** High

**Pre-conditions:** Reviewer logged in. Reviewer has activity across at least one full Review Cadence period — completed reviews, at least one kick-back via PR-030, recorded earnings, prior periods for trend comparison.

**Steps:**
1. Login as the reviewer.
2. Navigate to Profile > "My Scorecard" (or equivalent).
3. Select cadence period (e.g., Q1 2026).
4. Inspect the six metric tiles: Volume, Turnaround time, Quality / accuracy, Kick-back rate, Specialty mix, Earnings summary.
5. Verify the data shown matches what Super Admin would see for this same reviewer / period (per SA-096A).
6. Try to access another reviewer's scorecard via URL manipulation (e.g., change the reviewer ID in the URL).
7. Try to access SA-only views (period overrides, cross-reviewer comparison, etc.).
8. Try to download / export the scorecard.

**Expected Result:**
- Reviewer sees own scorecard with the same six metrics that Super Admin sees in SA-096A — same numbers, same period semantics.
- View is read-only — reviewer cannot edit any value or annotate.
- URL manipulation to access another reviewer's scorecard returns 403 / not found.
- SA-only controls (cross-reviewer comparison, etc.) are absent or return 403.
- PDF download / export availability per SA-096A note (confirm with PM).

**Notes:** NEW — fills gap on the reviewer side. Pairs with SA-096A. Persona matrix: Reviewer → own only, SA → all, Client → blocked, Credentialer → not exposed.

---
