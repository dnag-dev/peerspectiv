# Super Admin — Test Cases

> Persona: Peerspectiv staff (Ashton). Has full platform control. Run AFTER auth tests succeed. Do these BEFORE Client/Peer tests, since this sheet seeds companies, peers, forms, etc.

---


## Dashboard

### SA-001 — Dashboard loads with all required widgets

**Module:** Dashboard | **Priority:** High

**Pre-conditions:** Logged in as Super Admin.

**Steps:**
1. Navigate to Dashboard (default after login).

**Test Data:** _(none)_

**Expected Result:** Greeting (Good Morning/Afternoon/Evening), notification banner ('You have X new reviews to assign'), 3 status cards (Unassigned, In Progress, Past Due), Review queue list, Filter by Company dropdown.

---

### SA-002 — Status card counts match underlying data AND drill-down works

**Module:** Dashboard | **Priority:** High

**Pre-conditions:** At least 1 unassigned, 1 in-progress, 1 past-due review exist.

**Steps:**
1. Note the 3 numbers shown on Unassigned, In Progress, Past Due cards.
2. Click Reviews in sidebar.
3. Filter or scan to count actual items in each status.
4. Return to Dashboard. Click directly on the **Unassigned** status card number.
5. Click directly on the **In Progress** status card number.
6. Click directly on the **Past Due** status card number.

**Test Data:** _(none)_

**Expected Result:** Card counts match the actual count of items in each status — no off-by-one errors. Clicking a status card navigates to a drill-down page showing exactly the cases that compose that count, pre-filtered by the clicked status (Unassigned → unassigned list; In Progress → in-progress list; Past Due → past-due list). Drill-down counts equal the dashboard card numbers.

---

### SA-003 — Filter by Company dropdown filters review queue

**Module:** Dashboard | **Priority:** Medium

**Pre-conditions:** At least 2 companies with reviews exist.

**Steps:**
1. Click Filter by Company dropdown.
2. Select Company A.
3. Observe review list.

**Test Data:** _(none)_

**Expected Result:** Review queue updates to show only reviews for Company A. Status cards may or may not update — verify behavior is consistent.

---

### SA-004 — Contact button on review queue item

**Module:** Dashboard | **Priority:** Medium

**Pre-conditions:** At least 1 review with a peer assigned.

**Steps:**
1. On a review queue item, click Contact button.

**Test Data:** _(none)_

**Expected Result:** Action triggers (opens email client, or shows contact modal, or sends notification — verify expected behavior with PM). No 404/error.

---

### SA-005 — Assign button on review queue navigates correctly

**Module:** Dashboard | **Priority:** High

**Pre-conditions:** At least 1 unassigned review.

**Steps:**
1. On an unassigned review, click Assign button.

**Test Data:** _(none)_

**Expected Result:** Assign Review modal opens with peer-selection dropdown. Review name and doctor name are correctly populated.

---

### SA-008 — Collapse Menu hides labels and shrinks sidebar

**Module:** Dashboard | **Priority:** Low

**Pre-conditions:** —

**Steps:**
1. Click Collapse Menu at bottom of sidebar.

**Test Data:** _(none)_

**Expected Result:** Sidebar shrinks to icons-only. Labels hidden. Click again to expand back.

---


## Reviews

### SA-009 — Reviews list page loads with pagination

**Module:** Reviews | **Priority:** High

**Pre-conditions:** Many completed reviews in system.

**Steps:**
1. Click Reviews in sidebar.
2. Observe list.

**Test Data:** _(none)_

**Expected Result:** List shows columns: Form Name, Doctor, Score, Date Completed. Pagination controls visible (1, 2, 3, ..., last, Next). Each row has 3-dot action menu.

---

### SA-010 — Click into a completed review opens detail

**Module:** Reviews | **Priority:** Medium

**Pre-conditions:** At least 1 completed review.

**Steps:**
1. Click any completed review row (or its 3-dot menu → View).

**Test Data:** _(none)_

**Expected Result:** Review detail page opens with form questions, peer's answers, comments, score, and metadata (reviewer name, date, duration).

---

### SA-011 — Pagination works

**Module:** Reviews | **Priority:** Medium

**Pre-conditions:** More than 1 page of reviews.

**Steps:**
1. Note items on page 1.
2. Click Next or page 2.
3. Verify list updates.

**Test Data:** _(none)_

**Expected Result:** Page 2 shows different items. Can navigate forward and backward correctly.

---


## Reports

### SA-012 — Reports page loads

**Module:** Reports | **Priority:** High

**Pre-conditions:** —

**Steps:**
1. Click Reports in sidebar.

**Test Data:** _(none)_

**Expected Result:** Reports page loads with available report types and (if any) a list of previously generated reports.

---

### SA-013 — Generate Provider Highlights (Provider Score) report

**Module:** Reports | **Priority:** High

**Pre-conditions:** Reviews exist for selected company.

**Steps:**
1. On Reports page, choose Provider Score / Provider Highlights.
2. Select a company.
3. Choose a date range (e.g., Q4 2025 = Oct 1 – Dec 31).
4. Click Generate / Save.

**Test Data:** _(none)_

**Expected Result:** PDF generated showing each provider with 'Total Measures Met: X%'. Lists all providers reviewed in the date range.

**Notes:** Baseline test. SA-013D is the canonical test that adds cadence-period integration and persona-visibility coverage.

---

### SA-014 — Generate Specialty Highlights (Company Score) report

**Module:** Reports | **Priority:** High

**Pre-conditions:** Reviews exist across multiple specialties.

**Steps:**
1. On Reports page, choose Specialty Highlights.
2. Select company and date range.
3. Click Generate.

**Test Data:** _(none)_

**Expected Result:** PDF shows aggregate scores by specialty (Family, Dental, GYN, etc.) and an overall percentage. Matches Q4 2025 example PDF format.

**Notes:** Baseline test. SA-013C is the canonical test that adds cadence-period integration and persona-visibility coverage.

---

### SA-015 — Generate Question Analytics report (e.g., Family)

**Module:** Reports | **Priority:** High

**Pre-conditions:** Family Medicine reviews exist for date range.

**Steps:**
1. Choose Question Analytics.
2. Select Family Medicine specialty.
3. Select company and date range.
4. Generate.

**Test Data:** _(none)_

**Expected Result:** PDF shows each question with Yes/No/NA percentages and counts. Matches example PDF format.

**Notes:** Baseline test. SA-013B is the canonical test that adds cadence-period integration and persona-visibility coverage.

---

### SA-016 — Generate Quality Certificate PDF

**Module:** Reports | **Priority:** High

**Pre-conditions:** Reviews completed for selected period.

**Steps:**
1. Choose Quality Certificate.
2. Select company and quarter.
3. Generate.

**Test Data:** _(none)_

**Expected Result:** Branded certificate PDF generated. Includes registration number, assessment period, HRSA reference, signature.

**Notes:** Baseline test. SA-013E is the canonical test that adds cadence-period integration, persona visibility, and print-from-browser coverage.

---

### SA-017 — Generate Assignment Results report with multi-filter

**Module:** Reports | **Priority:** Medium

**Pre-conditions:** —

**Steps:**
1. Choose Assignment Results.
2. Apply filters: specific Doctor, Form, Tag, date range.
3. Generate.

**Test Data:** _(none)_

**Expected Result:** Report only contains rows matching all selected filters. Score badges color-coded green/yellow/orange correctly.

---

### SA-018 — Export report to PDF and Excel

**Module:** Reports | **Priority:** Medium

**Pre-conditions:** Generated report visible.

**Steps:**
1. Click Export → PDF.
2. Then click Export → Excel.

**Test Data:** _(none)_

**Expected Result:** Both files download successfully. Both contain the same data. PDF is paginated and readable; Excel has proper column headers.

---

### SA-019 — Date range filter validates start <= end

**Module:** Reports | **Priority:** Medium

**Pre-conditions:** —

**Steps:**
1. Set From date AFTER To date.
2. Click Generate.

**Test Data:** _(none)_

**Expected Result:** Validation error: 'End date must be after start date' (or similar). Report does not generate.

---

### SA-020 — Empty date range produces empty/zero report gracefully

**Module:** Reports | **Priority:** Low

**Pre-conditions:** —

**Steps:**
1. Choose a date range with no reviews (e.g., 1990-01-01 to 1990-01-02).
2. Generate.

**Test Data:** _(none)_

**Expected Result:** Empty report or 'No data found' message. No crash, no 500 error.

---


## Reports — 5 Canonical Report Types & Persona Visibility (NEW)

> **Confirmed with Ashton (May 2026):** There are 5 distinct report types that the system must produce. Each has a specific persona-visibility matrix. All reports are scoped to a Review Cadence period (per SA-063A) — date pickers should snap to the company's configured cadence labels (e.g., "Q4 2025", "Jan 2026", "Apr – Aug 2026") rather than arbitrary calendar dates.
>
> | # | Report | Granularity | Reviewer | Super Admin | Client (Company) |
> |---|---|---|:---:|:---:|:---:|
> | 1 | **Per-Provider Review Answers** | One reviewed encounter (one chart, one form, one provider) | ✅ own reviews only | ✅ all | ✅ own company only |
> | 2 | **Question Analytics** | One specialty, all providers, one cadence period | ❌ | ✅ all | ✅ own company only |
> | 3 | **Specialty Highlights** | All specialties, one cadence period — overall + per-specialty score | ❌ | ✅ all | ✅ own company only |
> | 4 | **Provider Highlights** | All providers in the company, one cadence period | ❌ | ✅ all | ✅ own company only |
> | 5 | **Quality Certificate** | One company, one cadence period — branded HRSA certificate | ❌ | ✅ all | ✅ own company only |
>
> Cross-tenant isolation: Client X cannot see Client Y's data — strict per-company scoping at every layer (cross-ref CL-013).

---

### SA-013A — Report Type 1: Per-Provider Review Answers (PDF)

**Module:** Reports | **Priority:** Critical

**Pre-conditions:** A completed review exists. Example: provider "Katherine Dunn", form "Great Plains Tribal Leaders General Medicine Peer Review", chart MRN visible (per PR-028..PR-038), date of encounter recorded.

**Steps:**
1. Login as Super Admin.
2. Open the completed review (from Reports, Assignments index, or peer profile).
3. Click "Generate PDF" or equivalent.
4. Inspect the generated PDF.
5. Repeat the same flow for: (a) the reviewer who completed this review, and (b) the client whose chart was reviewed.

**Test Data:** Reference PDF: `ReviewReportOfTheProvidersDoctor.png` (Katherine Dunn FYQ2 example).

**Expected Result:** PDF contains:
- Provider name (e.g., "Katherine Dunn"), Assignment / Form name (e.g., "Great Plains Tribal Leaders General Medicine Peer Review"), Patient identifier (MRN per PR-028 — NOT patient name unless explicitly enabled), Date of Encounter, Total Measures Met %.
- One row per question with the reviewer's answer (Yes / No / NA or A / B / C / NA depending on form scoring system per SA-127).
- "Additional Response" text shown when reviewer entered a follow-up comment (e.g., on No answers per SA-044 step 8).
- Visual styling matches example.
- Persona scoping verified:
  - Super Admin: any company, any provider, any review.
  - Reviewer: only reviews they completed themselves.
  - Client: only reviews of providers within their own company.
- A different client cannot access this PDF via URL manipulation (cross-ref CL-013).

**Notes:** NEW — was missing from SA-013/CL-009 coverage which only covered the aggregate Provider Highlights, not the per-review answer document.

---

### SA-013B — Report Type 2: Question Analytics (per-specialty across all providers, per cadence period)

**Module:** Reports | **Priority:** High

**Pre-conditions:** Multiple Family Medicine reviews completed across 20+ providers within a single cadence period. Company has Review Cadence = Quarterly, FY-Jan. Test period = Q4 2025.

**Steps:**
1. Login as Super Admin.
2. Reports > Question Analytics.
3. Select Company, Specialty = Family Medicine, Period = "Q4 2025" (selector should show cadence labels, not arbitrary dates).
4. Generate.
5. Inspect the PDF.
6. Repeat as Client (logged in to the same company); verify access.
7. Confirm Reviewer cannot access this report type.

**Test Data:** Reference PDF: `Family_Question_Analytics_Q4_2025.pdf`.

**Expected Result:** PDF contains:
- Header: "Family Question Analytics Q4 2025" + Date Range (cadence period dates, e.g., 2026-01-01 – 2026-01-31).
- One block per question with the question text, an aggregate % (Yes / Pass), Yes count, No count, NA count.
- For "No" answers, list of providers whose review answered No to that question (e.g., "Jennifer Huls, Gregory Jones").
- Persona scoping:
  - SA: any company.
  - Client: own company only.
  - Reviewer: blocked.
- Period selector uses cadence labels.

**Notes:** Updates SA-015 and CL-011 with the explicit cadence-period selector requirement.

---

### SA-013C — Report Type 3: Specialty Highlights (overall + per-specialty score for one cadence period)

**Module:** Reports | **Priority:** High

**Pre-conditions:** Reviews completed across multiple specialties for one company in one cadence period. Test period = Q4 2025.

**Steps:**
1. Login as Super Admin.
2. Reports > Specialty Highlights.
3. Select Company, Period = "Q4 2025".
4. Generate.
5. Inspect PDF.
6. Repeat as Client; verify access.
7. Confirm Reviewer cannot access.

**Test Data:** Reference PDF: `Example_Specialty_Highlights_Q4_2025.pdf`.

**Expected Result:** PDF contains:
- Header: "Specialty Highlights Q4 2025" + cadence-period date range.
- Top-right summary: "X% of the measures have been met" (overall score across all specialties for the company in that period).
- One row per specialty form with that specialty's score (e.g., GYN 96%, Psychiatry-Follow-up 100%, Pediatric 93%, Family 89%, Dental 88%).
- Persona scoping:
  - SA: any company.
  - Client: own company only.
  - Reviewer: blocked.

**Notes:** Updates SA-014 and CL-010 with cadence integration.

---

### SA-013D — Report Type 4: Provider Highlights (per-provider score for one cadence period)

**Module:** Reports | **Priority:** High

**Pre-conditions:** Reviews across many providers within one cadence period for one company. Test period = Q4 2025.

**Steps:**
1. Login as Super Admin.
2. Reports > Provider Highlights.
3. Select Company, Period = "Q4 2025".
4. Generate.
5. Inspect PDF (multi-page).
6. Repeat as Client; verify access.
7. Confirm Reviewer cannot access.

**Test Data:** Reference PDF: `Provider_Highlights_Q4_2025.pdf`.

**Expected Result:** PDF contains:
- Header: "Provider Highlights Q4 2025" + cadence-period date range + overall company % (e.g., 92%).
- One block per provider with their overall %, then a row per (form / specialty × number of reviews) with that score.
- Sorted alphabetically or by score (confirm with PM).
- Multi-page handled cleanly (no provider blocks split across pages awkwardly).
- Persona scoping: SA all, Client own, Reviewer blocked.

**Notes:** Updates SA-013 and CL-009 with cadence integration.

---

### SA-013E — Report Type 5: Quality Certificate (HRSA-recognized PDF for one company per cadence period)

**Module:** Reports | **Priority:** High

**Pre-conditions:** Reviews completed for company "Upper Great Lakes Family Health Center" for Q4 2025. Company has registration number on file (e.g., H80CS00110).

**Steps:**
1. Login as Super Admin.
2. Reports > Quality Certificate.
3. Select Company, Period = "Q4 2025".
4. Generate.
5. Print or download PDF.
6. Repeat as Client; verify access + ability to print.
7. Confirm Reviewer cannot access.

**Test Data:** Reference PDF: `Q4_2025_Peerspectiv_QUALITY_CERTIFICATE.pdf`.

**Expected Result:** PDF contains:
- Branded Peerspectiv header, "QUALITY CERTIFICATE" title.
- Company legal name + address.
- Boilerplate: "Has had licensed health care professionals conduct QI/QA assessments..."
- Registration Number (e.g., H80CS00110), Assessment Period (cadence period label, e.g., "Q4 2025"), Signed date.
- Signature image (Ashton Prejean, President).
- Print-ready layout (single page, landscape or per existing template).
- Persona scoping: SA all, Client own, Reviewer blocked.
- Client must be able to print directly from browser as well as download.

**Notes:** Updates SA-016 and CL-012 with explicit cadence period + print path.

---


## Peers

### SA-021 — Peers list page loads

**Module:** Peers | **Priority:** High

**Pre-conditions:** —

**Steps:**
1. Click Peers in sidebar.

**Test Data:** _(none)_

**Expected Result:** Peers list shows: First Name, Last Name, Email, License info, Actions. Pagination if many.

---

### SA-022 — Add a new Peer MANUALLY (Path B — direct entry, no peer interaction)

**Module:** Peers | **Priority:** High

**Pre-conditions:** Logged in as Super Admin. SA has the peer's information (e.g., from a phone call, a paper enrollment form, or copying from another system).

**Steps:**
1. Peers > "Add Peer Manually" (or equivalent — distinct from "Invite Peer" which is Path A per SA-031A).
2. Fill in: First Name, Last Name, Email, License Number, License State, License Issue Date, License Expiry Date, Specialties (multi-select), NPI, Max Case Load preference.
3. Upload License File (PDF).
4. Upload Avatar (optional).
5. Save.
6. Inspect the new peer's state on the Peers list.
7. Verify the Credentialer's dashboard shows this peer in the "newly added" bucket (per CR-003 / CR-005).
8. Verify Credentialer email notification fires.

**Test Data:** First: TestPeer / Last: QAOne / Email: testpeer.qa+timestamp@example.com / License: ABC12345 / State: TX / Issue Date: 2024-01-15 / Expiry: 2027-01-15 / Specialty: Family Medicine

**Expected Result:** Success toast. Peer appears in Peers list with state = **Pending Credentialing** (skips Invited and Pending Admin Review since SA personally entered the data — implicit admin approval). Credentialer is notified and can pick the peer up for verification. Peer does NOT receive a login until credentialed and Active.

**Notes:** This is **Path B** of two onboarding paths (May 2026):
- **Path A: Invite-driven** (SA-031A → SA-031B → SA-031C) — peer fills out the form themselves; SA approves before forwarding to Credentialer.
- **Path B: Manual direct entry** (this test, SA-022) — SA enters the data; record goes straight to Pending Credentialing.
- **Path C (variant of B): AI form upload** (SA-075) — SA uploads a filled enrollment form; AI extracts; same outcome as Path B.

All three paths converge at **Pending Credentialing**, then proceed identically through credentialing → Active.

---

### SA-023 — Add Peer with duplicate email is rejected

**Module:** Peers | **Priority:** High

**Pre-conditions:** Peer SA-022 exists.

**Steps:**
1. Try to add another peer using the SAME email.

**Test Data:** _(none)_

**Expected Result:** Validation error: 'The email has already been taken' or similar. Peer not created.

---

### SA-024 — Edit existing peer's license info

**Module:** Peers | **Priority:** Medium

**Pre-conditions:** Peer exists.

**Steps:**
1. Click peer row → Edit.
2. Change License Number and License State.
3. Save.

**Test Data:** _(none)_

**Expected Result:** Changes persist. List refresh shows new values.

---

### SA-025 — View peer's Assigned Reviews

**Module:** Peers | **Priority:** Medium

**Pre-conditions:** Peer with assignments exists.

**Steps:**
1. Open peer's profile.
2. Click Assigned Reviews tab.

**Test Data:** _(none)_

**Expected Result:** Table lists all assignments: Doctor, Date Assigned, Duration, Status (Complete/Incomplete), Paid/Not Paid.

---

### SA-026 — Generate Peer Earnings Report (invoice)

**Module:** Peers | **Priority:** High

**Pre-conditions:** Peer has completed reviews.

**Steps:**
1. Open peer profile → Generate Earnings Report.
2. Modal opens.
3. Confirm/edit Price Per Review (e.g., 35).
4. Pick Start Date and End Date covering completed reviews.
5. Click Generate Earnings Summary.

**Test Data:** _(none)_

**Expected Result:** Earnings PDF/summary opens or downloads. Shows count of reviews × price = total. Math is correct.

---

### SA-027 — Earnings report excludes incomplete reviews

**Module:** Peers | **Priority:** Medium

**Pre-conditions:** Peer has both complete and incomplete reviews.

**Steps:**
1. Generate earnings for a date range that includes both.

**Test Data:** _(none)_

**Expected Result:** Only completed reviews are counted toward earnings. Incomplete ones are excluded.

---

### SA-028 — Mark peer's reviews as Paid

**Module:** Peers | **Priority:** Medium

**Pre-conditions:** Earnings report generated; reviews shown as 'Not Paid'.

**Steps:**
1. On Assigned Reviews list, change status from Not Paid → Paid (button or toggle).

**Test Data:** _(none)_

**Expected Result:** Status updates and persists after refresh.

---

### SA-029 — Delete (or archive) a peer

**Module:** Peers | **Priority:** Medium

**Pre-conditions:** A test peer with no critical assignments.

**Steps:**
1. Click peer row → Delete.
2. Confirm dialog → Yes.

**Test Data:** _(none)_

**Expected Result:** Peer is removed from list. Their historical data (completed reviews) is preserved (verify by viewing a past report).

---

### SA-030 — Cannot delete peer with active assignments (or warning shown)

**Module:** Peers | **Priority:** High

**Pre-conditions:** Peer with active in-progress assignment.

**Steps:**
1. Try to delete that peer.

**Test Data:** _(none)_

**Expected Result:** Either deletion is blocked with message like 'Cannot delete: peer has active assignments. Reassign first.' OR a warning is shown asking to reassign. Verify behavior.

---

### SA-031 — Reset peer password from admin

**Module:** Peers | **Priority:** Medium

**Pre-conditions:** Peer exists.

**Steps:**
1. Open peer profile → Reset Password section.
2. Enter new password and confirmation.
3. Save.

**Test Data:** _(none)_

**Expected Result:** Password reset succeeds. Peer can log in with new password (verify by logging in as that peer in another browser/incognito).

---


## Peers — Lifecycle States & Self-Onboarding (NEW)

> **Peer state machine (confirmed May 2026):** Every peer record is in exactly one state at any time. Transitions are recorded in audit log with timestamp + actor. Only **Active** peers can be assigned cases.
>
> | State | Meaning | Assignable? |
> |---|---|---|
> | **Invited** | Self-onboarding link sent; peer has not yet submitted | ❌ |
> | **Pending Admin Review** | Peer submitted self-onboarding form; SA must approve | ❌ |
> | **Pending Credentialing** | SA approved (or SA manually added); record forwarded to Credentialer for verification | ❌ |
> | **Active** | Credentialed, license valid, ready for case assignment | ✅ |
> | **License Expired** | Was Active; license expiry date passed; auto-blocked | ❌ |
> | **Suspended** | SA manually deactivated (any reason — investigation, dispute, voluntary leave) | ❌ |
> | **Archived** | Removed via SA-029; historical data preserved | ❌ |
>
> **TWO PARALLEL ONBOARDING PATHS** (confirmed May 2026):
>
> - **Path A — Invite-driven (peer fills out their own info):**
>   `SA-031A` SA generates invite link & emails peer → state = **Invited**
>   → `SA-031B` peer fills self-onboarding form → state = **Pending Admin Review**
>   → `SA-031C` SA approves submission → state = **Pending Credentialing**
>   → Credentialer takes over.
>
> - **Path B — SA-initiated (SA enters everything directly):**
>   `SA-022` (manual entry) OR `SA-075` (AI form upload) → state = **Pending Credentialing** in one step.
>   → Credentialer takes over.
>
> Both paths converge at **Pending Credentialing**. From there, credentialing flow is identical — Credentialer verifies → state = **Active** → peer becomes assignable.
>
> **Allowed transitions:** (Path A) Invited → Pending Admin Review → Pending Credentialing → Active. (Path B) → Pending Credentialing → Active. Active ↔ License Expired (auto on expiry / renewal). Active → Suspended → Active (manual). Any state → Archived (terminal).

### SA-022B — Peer state machine: every peer record has a clear, visible state

**Module:** Peers | **Priority:** Critical

**Pre-conditions:** Peers seeded across multiple states (one per state where possible).

**Steps:**
1. Navigate to Peers list.
2. Inspect the Status column.
3. Filter by each state: Invited / Pending Admin Review / Pending Credentialing / Active / License Expired / Suspended / Archived.
4. Open a peer in each state and inspect the profile detail.

**Expected Result:**
- Status column visible on the Peers list with the current state for each peer.
- Each state has a distinct visual indicator (color / badge) so the list is scannable.
- Filter works for every state.
- Peer detail page shows current state prominently and includes the state-history audit log (transition timestamps + actor + reason if applicable).

**Notes:** NEW REQUIREMENT — confirmed with Ashton (May 2026): peers need explicit lifecycle states. Pairs with all SA-022x and SA-031A..F.

---

### SA-031A — Generate self-onboarding INVITE LINK for a new peer

**Module:** Peers | **Priority:** Critical

**Pre-conditions:** Logged in as Super Admin. SA has the new peer's email address ready.

**Steps:**
1. Navigate to Peers > "Invite New Peer" (or equivalent).
2. Enter the peer's email address (e.g., new.peer@example.com).
3. Optionally pre-fill First Name / Last Name as a courtesy.
4. Click "Send Invite" / "Generate Link".
5. Verify the email is sent to that address.
6. Verify the Peers list now shows a new record with state = **Invited**.
7. Inspect the invite link — it should contain a unique secure token (not a peer ID guessable from URL).
8. Try sending an invite to an email that already has a peer record (any state).

**Test Data:** new.peer@example.com (fresh) + an email tied to an existing peer.

**Expected Result:**
- Invite email sent successfully with a unique tokenized link to the self-onboarding form.
- New peer record created in **Invited** state — visible to SA in Peers list immediately.
- Invite link expires after a configurable window (e.g., 7 or 14 days — confirm with PM). Expired links cannot be used to submit.
- Duplicate-email invite blocked: "A peer with this email already exists ({state})." SA can resend the invite if existing record is still in Invited state.
- Audit log captures: who sent, when, recipient.

**Notes:** NEW REQUIREMENT — confirmed with Ashton (May 2026): SA can share a link letting the peer fill in their own details. Pairs with SA-031B (peer fills form) and SA-031C (SA approves).

---

### SA-031B — Peer fills self-onboarding form via invite link

**Module:** Peers (peer-side, no auth required) | **Priority:** Critical

**Pre-conditions:** Invite generated per SA-031A. Peer has not authenticated yet — the link is the auth mechanism for this flow.

**Steps:**
1. Open the invite link in an incognito browser (no logged-in session).
2. Inspect the self-onboarding form — should NOT require login.
3. Try submitting the form blank to test required-field validation.
4. Fill in: First Name, Last Name, Email (pre-filled, possibly read-only), License Number, License State, License Issue Date, License Expiry Date, Specialties (multi-select), NPI, Max Case Load preference.
5. Upload license document (PDF / image).
6. Upload supporting credentials if available (CV, board cert).
7. Submit.
8. Verify the peer sees a confirmation page ("Thanks — your details are with our admin for review").
9. Try opening the same link AGAIN (after submission).

**Test Data:** Realistic peer-profile data + sample PDF.

**Expected Result:**
- Self-onboarding form loads via tokenized link without requiring login.
- All required fields validated; missing data blocks submit with clear error messages.
- All MD/peer profile fields supported (matches the SA-022 / SA-099 / SA-117 schema).
- License-document upload works (per SA-120).
- On submit, peer record state transitions: **Invited → Pending Admin Review**. SA's Peers list updates accordingly.
- Confirmation page shown to peer; no system access granted yet.
- Re-opening the link after submission shows "Already submitted" — cannot edit further (peer must contact SA for changes).

**Notes:** NEW REQUIREMENT — peer fills out their own info; reduces SA data-entry burden. Pairs with SA-031A and SA-031C.

---

### SA-031C — Super Admin reviews and APPROVES peer self-onboarding submission

**Module:** Peers | **Priority:** Critical

**Pre-conditions:** Peer submitted self-onboarding form per SA-031B. State = **Pending Admin Review**.

**Steps:**
1. Login as SA.
2. Open Peers list, filter to "Pending Admin Review".
3. Click the new peer record.
4. Inspect the submitted data — verify all peer-entered values are visible (read-only or editable, per PM).
5. Inspect uploaded documents — preview the license PDF.
6. Click "Approve" / "Forward to Credentialer".
7. Verify state transitions to **Pending Credentialing**.
8. Verify the Credentialer's dashboard now shows this peer in the "newly added" bucket (per CR-003).
9. Confirm an email notification is sent to the Credentialer.

**Expected Result:**
- SA sees all peer-submitted data clearly. Can edit obvious typos before approving (or annotate, per PM).
- Approval transitions state: **Pending Admin Review → Pending Credentialing**.
- Credentialer is notified and can pick up the peer for verification.
- Audit log captures: SA approval, timestamp, any edits made.

**Notes:** NEW REQUIREMENT — explicit approval gate confirmed with Ashton (May 2026). SA has final say on whether self-onboarded peer goes to Credentialer.

---

### SA-031D — Super Admin REJECTS / requests changes on peer self-onboarding submission

**Module:** Peers | **Priority:** High

**Pre-conditions:** Peer record in **Pending Admin Review** state.

**Steps:**
1. SA opens the submission.
2. Notices issue (wrong specialty checked, missing doc, wrong license state, etc.).
3. Click "Request Changes" (or equivalent).
4. Enter a comment for the peer ("Please re-upload license — image is unreadable").
5. Submit.
6. Verify peer record returns to a state that allows the peer to edit and resubmit (e.g., back to **Invited**, or a new state **Changes Requested**).
7. Verify peer receives email with the SA's comment.
8. Have peer re-open original invite link; verify they can edit and resubmit.
9. Sub-scenario: SA fully rejects (peer is not a good fit) — confirm the reject path.

**Expected Result:**
- Request-changes path: peer can revise and resubmit. State cycles back to a peer-editable state. Email includes SA's specific comment.
- Reject path: state moves to **Archived** (or a "Rejected" terminal state — confirm with PM). Peer notified the application was not approved. Cannot resubmit using the same link.
- Audit log captures: SA decision, timestamp, comment.

**Notes:** NEW REQUIREMENT.

---

### SA-031E — Path B: SA-initiated direct entry → forwards to Credentialer (mirrors Path A's SA-031C)

**Module:** Peers | **Priority:** Critical

**Pre-conditions:** SA chose Path B (manual entry per SA-022 or AI form upload per SA-075) rather than sending an invite.

**Steps:**
1. SA adds peer via SA-022 or SA-075.
2. After save, verify the new peer's state.
3. Inspect Credentialer's dashboard.
4. Verify Credentialer notification email.
5. Compare end-state to a peer onboarded via Path A (after SA-031C approval) — both should be indistinguishable from the Credentialer's perspective.

**Expected Result:**
- Path B peer lands in **Pending Credentialing** state immediately on save (no Invited / Pending Admin Review states traversed — implicit admin approval since SA personally entered the data).
- Credentialer's dashboard shows the peer in the "newly added" bucket — identical visual / behavior to a Path A peer post-SA-031C approval.
- Credentialer email notification fires the same way.
- Audit log captures: state transition None → Pending Credentialing, actor = SA, mechanism = "Manual Add" or "AI Form Upload".
- From the Credentialer's perspective, Path A and Path B peers are indistinguishable — same workflow, same SLA, same fields.

**Notes:** Reconciles SA-022 + SA-075 with the state machine. Mirror of SA-031C — Path A's "approve and forward" is the equivalent of Path B's "save and forward." Both result in **Pending Credentialing** with the Credentialer notified.

---

### SA-031F — Pending Credentialing peer cannot be assigned cases

**Module:** Peers | **Priority:** Critical

**Pre-conditions:** Peer in **Pending Credentialing** state. Cases awaiting assignment match the peer's specialty.

**Steps:**
1. Try to assign a case to the Pending-Credentialing peer manually (per SA-067).
2. Trigger AI auto-suggestion (per SA-067A) on a fresh upload that matches the peer's specialty.
3. Open the assignment-target dropdown anywhere assignment happens.

**Expected Result:**
- Peer is filtered OUT of all assignment selectors (consistent with SA-122's expired-license rule).
- AI auto-suggestion does not propose this peer.
- Manual assignment by direct ID (URL / API) returns: "Cannot assign — peer not credentialed."
- Same enforcement applies for ALL non-Active states: Invited, Pending Admin Review, Pending Credentialing, License Expired, Suspended, Archived.

**Notes:** NEW REQUIREMENT — only **Active** state is assignable. Cross-ref CR-006 (existing test had this rule for "Inactive / Not Credentialed" — now generalized).

---

### SA-031G — Active → License Expired auto-transition

**Module:** Peers | **Priority:** Critical

**Pre-conditions:** Peer in **Active** state with License Expiry Date = yesterday (test fixture or wait for cron).

**Steps:**
1. Wait for the daily expiry-check job (or trigger manually for test).
2. Inspect peer state in Peers list.
3. Inspect Credentialer dashboard "Expired" bucket (per CR-003).
4. Try to assign a new case to the peer.

**Expected Result:**
- State auto-transitioned: **Active → License Expired**.
- Peer appears in Credentialer's Expired bucket.
- All assignment selectors filter out the peer (per SA-122).
- Notification fires to SA + Credentialer (per SA-123 / CR-018).

**Notes:** NEW REQUIREMENT — formalizes the existing CR-009 behavior. Auto-transition based on the license-expiry cron, not a manual SA action.

---

### SA-031H — License Expired → Active on credential renewal (state-machine canonical)

**Module:** Peers | **Priority:** Critical

**Pre-conditions:** Two peers as in CR-017 — one in License Expired state, one currently Active.

**Steps:**
1. Trigger the renewal flows from CR-017 (Scenario 1 and Scenario 2).
2. Inspect each peer's state immediately after the credentialer saves the new expiry.

**Expected Result:**
- **Peer A (License Expired):** state auto-transitions License Expired → Active. Audit log records the transition.
- **Peer B (Active):** state stays Active — **no transition fires** because there's nothing to transition from. Audit log records the expiry-date update as a non-state-changing edit.
- The state machine only triggers when crossing a state boundary. Updating fields on an already-Active peer is a metadata change, not a state event.

**Notes:** State-machine canonical reference. Renewal action behavior is in CR-017; this test focuses on the state-transition semantics. Formalizes the rule that an Active peer's renewal is a no-op for state.

---

### SA-031I — SA can SUSPEND an Active peer (manual deactivation)

**Module:** Peers | **Priority:** High

**Pre-conditions:** Peer in **Active** state.

**Steps:**
1. Peers > select peer > Edit > "Suspend Peer".
2. Required: enter reason ("Under investigation / disputed review / voluntary leave / etc.").
3. Confirm.
4. Inspect state.
5. Try to assign a new case.
6. Inspect existing in-progress cases assigned to this peer (cross-ref to existing open question in FutureRequirements.md).

**Expected Result:**
- State transitions: **Active → Suspended**. Reason captured in audit log.
- New assignments blocked (peer filtered out of selectors).
- In-progress cases: behavior per the open question (auto-revoke / continue / freeze) — same rule as license-expired, NOT a separate code path.

**Notes:** NEW REQUIREMENT — gives SA a manual lever distinct from license-expiry (which is automatic).

---

### SA-031J — SA can REINSTATE a Suspended peer (back to Active)

**Module:** Peers | **Priority:** Medium

**Pre-conditions:** Peer in **Suspended** state. License still valid (not expired).

**Steps:**
1. Peers > select peer > "Reinstate".
2. Required: enter reason / note.
3. Confirm.
4. Verify state.
5. Try to assign a case.

**Expected Result:**
- State transitions: **Suspended → Active**. Audit log captures reason.
- Peer reappears in assignment selectors.
- If license expired during the suspension period, state goes to **License Expired** instead of Active (auto-check on reinstate).

**Notes:** NEW REQUIREMENT.

---

### SA-031K — Archive a peer (terminal state, historical data preserved)

**Module:** Peers | **Priority:** Medium

**Pre-conditions:** Peer in any state with no in-progress assignments.

**Steps:**
1. Peers > select peer > "Archive" / "Delete".
2. Confirm.
3. Inspect Peers list.
4. Confirm completed-review history is still accessible via reports.

**Expected Result:**
- State transitions: **{any} → Archived** (terminal — cannot un-archive without admin support intervention).
- Peer hidden from default Peers list view; visible when filter = Archived.
- Historical reviews and earnings reports retained (consistent with SA-029).
- Cannot be assigned cases.

**Notes:** Reconciles SA-029 with the state machine — archive IS the delete path.

---

### SA-031L — State transitions captured in AUDIT LOG with timestamp + actor + reason

**Module:** Peers | **Priority:** High

**Pre-conditions:** A peer that has cycled through several states (e.g., Invited → Pending Admin Review → Pending Credentialing → Active → License Expired → Active → Suspended → Active).

**Steps:**
1. Open the peer profile.
2. Click "State History" / "Audit Log".
3. Inspect entries.

**Expected Result:**
- Every transition recorded: from-state, to-state, timestamp, actor (which user / "system" for auto-transitions), reason (if applicable).
- Cannot be edited or deleted by anyone (HIPAA / accreditation audit integrity).
- Sortable / filterable by state or date range.

**Notes:** NEW REQUIREMENT — audit log is the source of truth. Pairs with SA-126 (license history audit log — same audit infrastructure).

---


## Companies

### SA-032 — Companies list page loads

**Module:** Companies | **Priority:** High

**Pre-conditions:** —

**Steps:**
1. Click Companies in sidebar.

**Test Data:** _(none)_

**Expected Result:** List shows Company Name, Main Contact, Main Contact Email, # of Doctors, Edit/Remove actions, pagination, + floating action button.

---

### SA-033 — Add new Company (onboard client)

**Module:** Companies | **Priority:** High

**Pre-conditions:** —

**Steps:**
1. Click + button.
2. Enter Company Name, Main Contact Name, Main Contact Email.
3. Set per-review price (or accept default).
4. Save.

**Test Data:** Company: QA Test Clinic
Contact: Tester One
Email: qa.client+timestamp@example.com

**Expected Result:** Success toast. Company appears in list. A Client account/password is generated (verify password is shown OR sent via email).

---

### SA-034 — Generated Client login works

**Module:** Companies | **Priority:** High

**Pre-conditions:** Company SA-033 created; password obtained.

**Steps:**
1. Open incognito window.
2. Log in with new client email + generated password.

**Test Data:** _(none)_

**Expected Result:** Client successfully logs in and lands on Client Dashboard.

---

### SA-035 — Edit Company name and main contact

**Module:** Companies | **Priority:** Medium

**Pre-conditions:** Company exists.

**Steps:**
1. Click Edit on a company.
2. Change name and contact email.
3. Save.

**Test Data:** _(none)_

**Expected Result:** Changes persist. List shows updated values.

---

### SA-036 — Generate Client Invoice

**Module:** Companies | **Priority:** Critical

**Pre-conditions:** Company has completed reviews in the period.

**Steps:**
1. Click Edit on company → Generate Invoice (or similar).
2. Pick date range (e.g., a quarter).
3. Confirm price per review.
4. Generate.

**Test Data:** _(none)_

**Expected Result:** Invoice PDF generated. Total = (# of reviews) × (price per review). Math is exactly correct. Invoice number, date, billing details all populated.

---

### SA-037 — Invoice math: changing PRICE per review updates total

**Module:** Companies | **Priority:** High

**Pre-conditions:** Same company with a fixed set of reviews in a defined period (e.g., 50 reviews in Q4).

**Steps:**
1. Generate invoice for the period with price per review = $90. Note count and total.
2. Edit price per review to $100 (or regenerate with the new rate).
3. Note new count and total.
4. Compute manually: count × $10 = expected delta.
5. Compare invoice totals.

**Test Data:** 50 reviews × ($100 − $90) = expected delta of $500.

**Expected Result:** Count is identical between the two runs. Totals differ by exactly (count × price-delta). No rounding errors. Invoice line items reflect new rate. Audit log captures the rate change.

---

### SA-037B — Invoice math: changing COUNT updates total

**Module:** Companies | **Priority:** High

**Pre-conditions:** Same company with a generated invoice. Price per review fixed at $100.

**Steps:**
1. Generate invoice with count = 50 reviews, price = $100. Note total = $5,000.
2. Edit count to 48 (e.g., 2 duplicates removed).
3. Save and regenerate.
4. Note new total.
5. Compute manually: 48 × $100 = $4,800.
6. Edit count to 52 (e.g., 2 late submissions added).
7. Save and regenerate.
8. Compute manually: 52 × $100 = $5,200.

**Test Data:** Counts: 50 → 48 → 52. Price: $100. Expected totals: $5,000 → $4,800 → $5,200.

**Expected Result:** Each count change recalculates total exactly. Price unchanged across runs. Invoice line items reflect new count. No rounding errors. Audit log captures count changes with reason. (Cross-ref SA-080 for the full edit + regenerate flow.)

**Notes:** Confirmed with Ashton — count must be editable on the invoice, with total updating accordingly. Pairs with SA-037 (price change) and SA-080 (full regenerate flow).

---

### SA-038 — Add Doctor to Company

**Module:** Companies | **Priority:** High

**Pre-conditions:** Company exists.

**Steps:**
1. Open company → Add Doctor.
2. Enter First Name, Last Name, Credentials (e.g., M.D.), Specialty (e.g., Family Medicine).
3. Save.

**Test Data:** _(none)_

**Expected Result:** Doctor added. Doctor count for company increments by 1.

---

### SA-039 — Bulk upload doctors via CSV

**Module:** Companies | **Priority:** Medium

**Pre-conditions:** CSV file with valid columns (First, Last, Credentials, Specialty).

**Steps:**
1. Open Add Doctors → Bulk Upload.
2. Upload CSV.
3. Confirm preview.
4. Submit.

**Test Data:** _(none)_

**Expected Result:** All rows imported successfully. Doctors appear in list. Doctor count updated. Errors (if any) clearly reported per row.

---

### SA-040 — Add Location to Company

**Module:** Companies | **Priority:** Medium

**Pre-conditions:** Company exists.

**Steps:**
1. Open company → Add Location.
2. Enter location name, address.
3. Save.

**Test Data:** _(none)_

**Expected Result:** Location added. Location appears in list and is selectable in Filters and Reports.

---

### SA-041 — Remove a company (no active reviews)

**Module:** Companies | **Priority:** High

**Pre-conditions:** Test company with no active reviews.

**Steps:**
1. Click Remove on company.
2. Confirm.

**Test Data:** _(none)_

**Expected Result:** Company removed. Login for that client no longer works.

---

### SA-042 — Cannot remove company with active reviews (or data preserved)

**Module:** Companies | **Priority:** Critical

**Pre-conditions:** Company with reviews.

**Steps:**
1. Try to remove.

**Test Data:** _(none)_

**Expected Result:** Removal is blocked OR archives instead of hard-deleting. Historical reports for that company still accessible.

---


## Forms

### SA-043 — Forms list page loads

**Module:** Forms | **Priority:** High

**Pre-conditions:** —

**Steps:**
1. Click Forms in sidebar.

**Test Data:** _(none)_

**Expected Result:** List of all forms shown. Each shows form name, total responses, average duration, Publish/Draft state.

---

### SA-044 — Create new peer review form: per-question option set + per-question default answer

**Module:** Forms | **Priority:** Critical

**Pre-conditions:** —

**Steps:**
1. Click + Create Form.
2. Name it 'QA Test Form ' + timestamp.
3. Select company.
4. Click Add Field → Multiple Choice. **Question 1**: 'Is BP documented?'
5. On Question 1, locate the **Option Set selector** at the question level. Pick **Yes / No / NA**.
6. On Question 1, locate the **Default Answer selector** — pick which option is pre-selected when a reviewer first loads the form (e.g., set default = "Yes").
7. Toggle Question 1 Required ON.
8. Toggle 'Require additional response if No is selected' ON.
9. Click Add Field → Multiple Choice. **Question 2**: 'Documentation completeness?'
10. On Question 2, pick Option Set = **A / B / C / NA**.
11. On Question 2, pick Default Answer = "NA".
12. Add a Short Answer field for any QA-related comments (e.g., 'Comments and Recommendations').
13. **Verify the form builder does NOT show "MRN", "Reviewer name", or "License number" as editable fields** — these are system-rendered at reviewer fill time (see SA-044B and PR-028 / PR-039).
14. Click Publish.
15. Open the form as a reviewer (or via preview).
16. Verify Question 1 shows pre-selected "Yes" and Question 2 shows pre-selected "NA".
17. Verify the system-rendered attestation block (MRN + Reviewer name + License number) appears at fill time, separate from the QA fields above.

**Test Data:** _(none)_

**Expected Result:**
- Form builder is for QA questions ONLY. Admin cannot add, edit, or delete the three system fields (MRN, Reviewer name, License number).
- Each multiple-choice question has its own Option Set selector (Yes/No/NA or A/B/C/NA). Two questions on the same form can use DIFFERENT option sets.
- Each multiple-choice question has its own Default Answer selector. The chosen default is pre-populated when the reviewer loads the form.
- Form is publishable and appears in upload-flow dropdown.
- At reviewer fill time, a separate attestation block renders the three system fields above the QA questions.

**Notes:** Confirmed with Ashton (May 2026):
1. Option set is **per-question**, not per-form.
2. "Default value" = answer pre-populated when reviewer opens the form (NOT a scoring weight). Reviewer can change.
3. MRN, Reviewer name, License number are **system-rendered at fill time**, NOT part of the form schema. They appear on every review regardless of form definition. See SA-044B for enforcement and PR-028 / PR-029 / PR-039 for reviewer-side behavior.

**Open question:** Per-question vs per-form scoring model — see FutureRequirements.md.

---

### SA-044B — System attestation block (MRN + Reviewer name + License) renders on every review

**Module:** Forms | **Priority:** Critical

**Pre-conditions:** Three forms in the system, all created in the new app: a freshly created form, a second form created by the same admin in a different specialty, and a form created by a different admin. SMTP not required.

**Steps:**
1. As Super Admin, open the form builder for any of the three forms. Confirm the system fields (MRN, Reviewer name, License number) are NOT visible as editable form fields. Verify there is no "delete" or "make optional" control for them anywhere in the builder.
2. Login as a reviewer. Open a case using each of the three forms in turn.
3. On each form, inspect the attestation block: it should render at fill time with three fields — MRN, Reviewer name, License number — clearly grouped above (or below) the QA questions.
4. Try to submit each review with all three system fields blank. Verify each is required.
5. Verify Reviewer name and License number are pre-populated from the reviewer's profile.
6. Verify MRN is pre-populated from AI chart-reading (if a parseable MRN is present in the chart).
7. Try to edit Reviewer name or License number. Verify behavior (locked vs. editable — confirm with PM).
8. Try to edit MRN. Verify it is editable so the reviewer can correct AI errors.

**Test Data:** _(none)_

**Expected Result:**
- The three system fields are rendered identically on **every** form (regardless of which admin created it or when), with no per-form override.
- Form builder UI does not expose them as editable / deletable / optional. Admin has no path to remove or modify them.
- All three are required at submit. Submit blocked if any is blank.
- Reviewer name + License number auto-populate from profile (see PR-039).
- MRN auto-populates from AI chart extraction; reviewer can correct (see PR-029 / PR-036).
- If the data model later adds a fourth system field, it should be a single-renderer change that applies to all forms automatically.

**Notes:** Confirmed with Ashton (May 2026): MRN, Reviewer name, License number are **static, mandatory, system-rendered** at reviewer fill time — not part of any form's schema. Reviewer name + License auto-populate from profile. MRN auto-populates from AI; reviewer can override.

---

### SA-045 — Per-question option set picker + default-answer pre-fill on form load

**Module:** Forms | **Priority:** High

**Pre-conditions:** Form Builder open. Test BOTH option sets across multiple questions in the same form.

**Steps:**
1. Create new form. Add 4 multiple-choice questions.
2. Question 1: pick option set Yes/No/NA. Pick Default Answer = "Yes".
3. Question 2: pick option set Yes/No/NA. Pick Default Answer = "NA".
4. Question 3: pick option set A/B/C/NA. Pick Default Answer = "A".
5. Question 4: pick option set A/B/C/NA. Pick Default Answer = "NA".
6. Save and Publish.
7. Open the form as a reviewer (or use Preview).
8. Inspect each question's pre-populated answer.
9. On Question 1, change the answer from "Yes" to "No". Submit / save draft.
10. Re-open the same review.

**Test Data:** Defaults: Q1=Yes, Q2=NA, Q3=A, Q4=NA.

**Expected Result:**
- Each question independently uses its picked option set. Q1 + Q2 show Yes/No/NA radios; Q3 + Q4 show A/B/C/NA radios.
- On first load, reviewer sees: Q1 pre-filled "Yes", Q2 pre-filled "NA", Q3 pre-filled "A", Q4 pre-filled "NA".
- Default is a **starting suggestion** — reviewer can change it (Step 9). The reviewer's saved value overrides the default, and Step 10 shows the reviewer's last value, not the default.
- Defaults are configurable per question and persist on save / reload of the FORM (not the review).

**Notes:** Confirmed with Ashton (May 2026): "default value" = the answer that's pre-populated when the reviewer first loads the form. Saves the reviewer time on the most-common answer. Per-question, not per-form.

---

### SA-046 — _RETIRED — Op Terms feature removed_

**Module:** Forms | **Priority:** —

**Pre-conditions:** —

**Steps:** Originally tested attaching an "Op Term" (e.g., 'BP', 'Heart') to a form question to drive question-level analytics. Confirmed with Ashton (May 2026) that **Op Terms are no longer needed** and the entire feature is being removed. Question-level analytics (where they exist) are driven by the question itself, not by a parallel taxonomy.

**Test Data:** _(none)_

**Expected Result:** _Test retired — do not run. If "Op Term", "Select Term", or any "Op Terms" UI reappears anywhere in Form Builder or Settings, log a bug._

**Notes:** RETIRED — kept as a placeholder so test IDs don't shift.

---

### SA-047 — Drag/reorder form fields

**Module:** Forms | **Priority:** Medium

**Pre-conditions:** Form with 3+ fields.

**Steps:**
1. Drag field 3 to position 1 using the drag handle (...)
2. Save.

**Test Data:** _(none)_

**Expected Result:** Order persists. New peer reviews using this form show fields in new order.

---

### SA-048 — Duplicate an existing form

**Module:** Forms | **Priority:** Medium

**Pre-conditions:** Form exists.

**Steps:**
1. Click 3-dot menu on form → Duplicate.

**Test Data:** _(none)_

**Expected Result:** Copy created with name like 'Form Name (Copy)'. All fields preserved.

---

### SA-049 — Publish vs Save Draft

**Module:** Forms | **Priority:** Medium

**Pre-conditions:** —

**Steps:**
1. Create form, click Save Draft.
2. Verify form NOT shown when uploading files for review.
3. Edit form → Publish.
4. Verify form IS shown in upload dropdown.

**Test Data:** _(none)_

**Expected Result:** Drafts are not selectable for assignment; only Published forms are.

---

### SA-050 — Delete a form (no reviews completed)

**Module:** Forms | **Priority:** Medium

**Pre-conditions:** Test form, never used.

**Steps:**
1. Click 3-dot → Delete.
2. Confirm.

**Test Data:** _(none)_

**Expected Result:** Form removed.

---

### SA-051 — Cannot delete form used in completed reviews (data integrity)

**Module:** Forms | **Priority:** High

**Pre-conditions:** Form has at least 1 completed review.

**Steps:**
1. Try to delete.

**Test Data:** _(none)_

**Expected Result:** Either blocked with informative message OR archived (not hard-deleted). Past review data and reports must remain intact.

---


## Tags

> **Tag scope (confirmed May 2026):** Hybrid model. Two types of tags coexist:
> - **Cadence tags** ("Q1 2026", "Jan 2026", "Apr – Aug 2026") are **per-company** and auto-generated by Review Cadence (see SA-063A/B/C/D). The same label string can exist for multiple companies as separate records — "Q1 2026" for an FY-Jan company means Jan–Mar; for an FY-April company it means Apr–Jun. Not interchangeable.
> - **Global ad-hoc tags** ("Audit", "Priority", "Sample") are **global** and reusable across companies. Created manually.
>
> Cadence tags cannot be created manually; ad-hoc tags cannot conflict with auto-generated cadence labels (SA-053). Tags page has a Company filter to scope the view.

### SA-052 — Tags list shows scope (Cadence vs Global) + Company filter

**Module:** Tags | **Priority:** Medium

**Pre-conditions:** At least 2 companies exist with Review Cadence configured. Each has at least 1 cadence tag (auto-generated via SA-063D). At least 2 global ad-hoc tags exist (e.g., "Audit", "Priority").

**Steps:**
1. Click Tags in sidebar.
2. Inspect default view.
3. Use the Company filter at the top of the Tags page.
4. Switch filter through: "All companies" → Company A → Company B → "Global only".
5. For each filtered view, inspect what's listed.

**Test Data:** Companies A and B. Global tags: "Audit", "Priority", "Sample".

**Expected Result:**
- Each tag row shows: name, **scope** ("Cadence — {Company}" or "Global"), # batches it's used on, Date Created. Pagination supported.
- Default view = "All companies": shows global tags + cadence tags from every company. Cadence tags display the company name to disambiguate (e.g., a row "Q1 2026 (Acme Health)" and another "Q1 2026 (Beta Clinic)" coexist as separate records).
- Filter = Company A: shows global tags + only Company A's cadence tags.
- Filter = Company B: shows global tags + only Company B's cadence tags.
- Filter = "Global only": shows just the global ad-hoc tags ("Audit", "Priority", "Sample"). Cadence tags hidden.
- Cadence tags are visually marked (badge / icon / different column) to distinguish from global.

**Notes:** Confirmed with Ashton (May 2026): tags are **hybrid** — cadence tags scoped per-company, manual ad-hoc tags global. Reuse benefit applies only to ad-hoc; cadence labels can collide ("Q1 2026" means different periods for FY-Jan vs FY-April companies, see SA-063A).

---

### SA-053 — Create new GLOBAL ad-hoc tag (manual)

**Module:** Tags | **Priority:** Medium

**Pre-conditions:** —

**Steps:**
1. Click + Add Tag.
2. Verify the dialog/form indicates this is a Global ad-hoc tag (not a cadence tag).
3. Try entering a name that looks like a cadence label, e.g., "Q3 2026" or "Jan 2026". Verify behavior.
4. Cancel and re-open. Enter a clearly ad-hoc name: "Audit".
5. Save.
6. Open Upload File flow for any company; inspect the Tag dropdown.
7. Open Upload File flow for a DIFFERENT company; inspect the Tag dropdown.

**Test Data:** Tag name "Audit". Cadence-shaped name "Q3 2026" tested for collision behavior.

**Expected Result:**
- Manual tag is created with scope = Global.
- Cadence-shaped names are either rejected ("This looks like a cadence label — those are auto-generated per company") OR accepted with a warning. Confirm the chosen behavior with PM.
- "Audit" is visible in the Tag dropdown when uploading files for **any** company. Reusable across companies.
- Manual creation flow does NOT create cadence tags — those are auto-generated by Review Cadence (see SA-063D).

**Notes:** Confirmed with Ashton (May 2026): manual ad-hoc tags are global; cadence tags are per-company and auto-generated only.

---

### SA-054 — Delete unused tag (Global and Cadence variants)

**Module:** Tags | **Priority:** Low

**Pre-conditions:** One unused Global tag (0 batches) and one unused Cadence tag from a future period (0 batches).

**Steps:**
1. From Tags list, find the unused Global tag. Delete.
2. Find the unused Cadence tag. Try to delete.

**Test Data:** Global tag "Test-Global". Cadence tag "Q4 2027" (future period, 0 uploads yet).

**Expected Result:**
- Global tag deletes cleanly.
- Cadence tag: behavior to confirm with PM. Two reasonable options: (a) blocked because it's auto-managed by Review Cadence (recreated next time period activates); (b) deletes but auto-regenerates next time the period starts. Whichever is picked, behavior must be deterministic and documented.

**Notes:** Cadence tags are owned by the cadence engine — the user-facing Delete should NOT silently break period auto-tagging.

---

### SA-055 — Cannot delete tag still in use (Global or Cadence)

**Module:** Tags | **Priority:** Medium

**Pre-conditions:** One Global tag attached to ≥1 batch. One Cadence tag attached to ≥1 batch.

**Steps:**
1. Try to delete the in-use Global tag.
2. Try to delete the in-use Cadence tag.

**Expected Result:** Both blocked with a clear message (or cascade safely if PM chose that approach). Behavior must match between scopes — no scenario where one type of in-use tag silently disappears and another doesn't.

**Notes:** Verify with PM the expected behavior (block vs cascade vs archive).

---


## Settings

> **Note:** The "Op Terms" feature has been removed entirely (Settings section, Form Builder "Select Term" dropdown, and any company-scoped term taxonomy). SA-046 and SA-059 are retired. If "Op Terms" or "Select Term" reappears anywhere in UI, log a bug.

### SA-056 — Settings page loads with all sections

**Module:** Settings | **Priority:** High

**Pre-conditions:** —

**Steps:**
1. Click Settings in sidebar.

**Test Data:** _(none)_

**Expected Result:** Sections visible: File Expiration (hours), Global Pay Rate per Review (USD). (Op Terms section removed — see retired SA-046 / SA-059.)

---

### SA-057 — Update File Expiration hours

**Module:** Settings | **Priority:** High

**Pre-conditions:** —

**Steps:**
1. Change File Expiration from 48 to 336 (14 days).
2. Save.

**Test Data:** _(none)_

**Expected Result:** Setting persists. New batches uploaded after this change use the new expiration.

---

### SA-058 — Update Global Pay Rate Per Review

**Module:** Settings | **Priority:** Critical

**Pre-conditions:** —

**Steps:**
1. Change Global Pay Rate from $35 to $40.
2. Save.
3. Open a peer's Generate Earnings modal.

**Test Data:** _(none)_

**Expected Result:** Default Price Per Review in earnings modal now shows $40 (or whatever new value was set).

---

### SA-059 — _RETIRED — Op Terms feature removed_

**Module:** Settings | **Priority:** —

**Pre-conditions:** —

**Steps:** Originally tested adding a company-scoped "Op Term" (e.g., 'BP') in Settings. Confirmed with Ashton (May 2026) that the Op Terms feature is removed entirely. The Op Terms section should not exist in Settings.

**Test Data:** _(none)_

**Expected Result:** _Test retired — do not run. If the Op Terms section reappears in Settings, log a bug. (See SA-046 retirement note.)_

**Notes:** RETIRED — kept as a placeholder so test IDs don't shift.

---

### SA-060 — Negative number rejected for File Expiration

**Module:** Settings | **Priority:** Medium

**Pre-conditions:** —

**Steps:**
1. Enter -1 in File Expiration.
2. Save.

**Test Data:** _(none)_

**Expected Result:** Validation error. Save blocked.

---


## Companies — Review Cadence (NEW)

> **What it is:** A per-company configuration that defines (a) how often the company runs review cycles, (b) when each cycle's window starts/ends, and (c) the label format AI applies when auto-tagging uploaded charts. **Naming confirmed with Ashton (May 2026): "Review Cadence"**. Tag formats confirmed: "Q1 2026" (quarterly), "Jan 2026" (monthly), "Jan – Feb 2026" / "April – Aug 2026" (multi-month durations). **Fiscal Year Start is required for every frequency** — January is most common, but April / July / October etc. are all supported. The same calendar date can map to different cadence labels across companies based on their FY start. Existing tags are **reused**, not duplicated, when subsequent uploads land in the same period — see SA-063D.

### SA-063A — Configure Review Cadence (Quarterly) — with fiscal year start

**Module:** Companies | **Priority:** Critical

**Pre-conditions:** Two test companies. Today = May 02, 2026.

**Steps:**
1. **Company A — January fiscal year start:**
   - Open Company A > Edit > "Review Cadence" section.
   - Frequency = **Quarterly**, Fiscal Year Start = **January**.
   - Tag Label Format = **"Q{quarter} {year}"** (e.g., "Q1 2026"). An alternate format **"{startShortMonth} – {endShortMonth} {year}"** → "Jan – Mar 2026" should also be selectable.
   - Save and reload.
   - Verify period sequence for FY 2026: Q1 = Jan – Mar 2026, Q2 = Apr – Jun 2026, Q3 = Jul – Sep 2026, Q4 = Oct – Dec 2026.
   - Verify preview: "Today is Saturday, May 02, 2026 — current period: Q2 2026."
2. **Company B — April fiscal year start:**
   - Open Company B > Review Cadence.
   - Frequency = **Quarterly**, Fiscal Year Start = **April**.
   - Tag Label Format = **"Q{quarter} {year}"**.
   - Save and reload.
   - Verify period sequence for FY 2026 (which runs Apr 2026 → Mar 2027): Q1 = Apr – Jun 2026, Q2 = Jul – Sep 2026, Q3 = Oct – Dec 2026, **Q4 = Jan – Mar 2027**.
   - Verify preview: "Today is Saturday, May 02, 2026 — current period: Q1 2026."
3. **Boundary upload check (both companies):**
   - Upload a chart to each on May 2, 2026.
   - Verify Company A tags as "Q2 2026" (Apr–Jun is its Q2).
   - Verify Company B tags as "Q1 2026" (Apr–Jun is its Q1).

**Test Data:** Company A FY-Jan / Company B FY-April. Today = May 02, 2026.

**Expected Result:**
- Both companies persist independently.
- The same calendar date (May 2, 2026) maps to **different cadence labels** depending on each company's FY start: "Q2 2026" for Company A, "Q1 2026" for Company B.
- Company B's Q4 label is "Q1 – Mar 2027" — when a quarter crosses a calendar-year boundary, the label uses the calendar year of the END month.
- Tag labels uniquely identify the period within a company. Same label across two companies refers to different date windows — that's expected.

**Notes:** NEW REQUIREMENT — confirmed with Ashton (May 2026): Fiscal Year Start applies to **all cadence frequencies**, not just quarterly. April-start makes the FY run April–March; the label's calendar-year stamp can flip mid-FY (Q4 = Jan–Mar of the following year). Pairs with SA-063B (monthly), SA-063C (custom), SA-063D (tag reuse).

---

### SA-063B — Configure Review Cadence (Monthly) — with fiscal year start

**Module:** Companies | **Priority:** High

**Pre-conditions:** Two test companies. Today's date = May 02, 2026.

**Steps:**
1. **Company A — Calendar year start:**
   - Open Company A > Review Cadence.
   - Frequency = **Monthly**.
   - Fiscal Year Start = **January**.
   - Tag Label Format = **"{shortMonth} {year}"**.
   - Save and reload.
   - Verify the preview shows current period.
   - Inspect period sequence for FY 2026: Jan 2026, Feb 2026, Mar 2026, Apr 2026, May 2026, Jun 2026, Jul 2026, Aug 2026, Sep 2026, Oct 2026, Nov 2026, Dec 2026 — all 12 months stamped with year **2026**.
2. **Company B — April fiscal year start:**
   - Open Company B > Review Cadence.
   - Frequency = **Monthly**.
   - Fiscal Year Start = **April**.
   - Tag Label Format = **"{shortMonth} {year}"**.
   - Save and reload.
   - Inspect period sequence for FY 2026 (which runs Apr 2026 → Mar 2027): Apr 2026, May 2026, Jun 2026, Jul 2026, Aug 2026, Sep 2026, Oct 2026, Nov 2026, Dec 2026, Jan 2027, Feb 2027, Mar 2027.
   - Note that Jan 2027, Feb 2027, Mar 2027 belong to FY 2026, not FY 2027.
3. **Boundary uploads (both companies):**
   - Upload a chart to each on May 02, 2026.
   - Verify both files tag as **"May 2026"** (the calendar month is what's on the tag, but the FY association differs in the back-end).

**Test Data:** Company A FY-Jan / Company B FY-April. Today = May 02, 2026.

**Expected Result:**
- Both companies persist their settings independently.
- Company A's FY 2026 = Jan–Dec 2026 (12 calendar months, all stamped 2026).
- Company B's FY 2026 = Apr 2026 → Mar 2027 (12 months, year stamp transitions from 2026 to 2027 mid-FY). Year on the tag is the **calendar year of the month** (Jan 2027, not Jan 2026), even though the FY label internally is "FY 2026."
- Both companies tag charts uploaded on May 2, 2026 as "May 2026" — the tag uses the calendar month, but the company's FY structure determines which fiscal year that period belongs to (visible on reports / period selector).

**Notes:** NEW REQUIREMENT — confirmed with Ashton (May 2026): Fiscal Year Start applies to **all cadence frequencies** (monthly, quarterly, custom), not just quarterly. April-start example: the FY runs April 2026 through March 2027. Calendar year on the tag flips mid-FY (Dec 2026 → Jan 2027). Pairs with SA-063A (quarterly), SA-063C (custom), SA-063D (tag reuse).

---

### SA-063C — Configure Review Cadence (Custom Multi-Month — duration ranges) — with fiscal year start

**Module:** Companies | **Priority:** Medium

**Pre-conditions:** Test companies exist. Today = May 02, 2026.

**Steps:**
1. **Bi-monthly with January FY start:**
   - Open company > Review Cadence.
   - Frequency = **Custom**, Period Length = **2 months**, Fiscal Year Start = **January**.
   - Label Format = **"{startShortMonth} – {endShortMonth} {year}"** → "Jan – Feb 2026".
   - Save and reload.
   - Verify period sequence for FY 2026: Jan – Feb 2026, Mar – Apr 2026, May – Jun 2026, Jul – Aug 2026, Sep – Oct 2026, Nov – Dec 2026.
2. **5-month period with April FY start:**
   - Frequency = Custom, Period Length = **5 months**, Fiscal Year Start = **April**.
   - Label Format = "{startMonth} – {endMonth} {year}" (long month, e.g., "April – Aug 2026").
   - Save.
   - Verify period sequence for FY 2026 (FY runs April 2026 → March 2027): April – Aug 2026, Sep 2026 – Jan 2027, Feb – Jun 2027.
   - Note period 2 crosses a calendar year — label uses **both years explicitly** ("Sep 2026 – Jan 2027").
3. **6-month period with January FY start (semi-annual):**
   - Frequency = Custom, Period Length = **6 months**, Fiscal Year Start = **January**.
   - Save.
   - Verify period sequence for FY 2026: Jan – Jun 2026, Jul – Dec 2026.
4. **6-month period with July FY start (semi-annual, non-calendar FY):**
   - Frequency = Custom, Period Length = **6 months**, Fiscal Year Start = **July**.
   - Save.
   - Verify period sequence for FY 2026 (FY runs July 2026 → June 2027): Jul – Dec 2026, Jan – Jun 2027.
5. **Boundary upload check (all four configs):**
   - Upload a chart to each company on May 2, 2026.
   - Verify tags match the current period for each:
     - Config 1 (2-month, Jan FY) → "May – Jun 2026"
     - Config 2 (5-month, Apr FY) → "April – Aug 2026"
     - Config 3 (6-month, Jan FY) → "Jan – Jun 2026"
     - Config 4 (6-month, Jul FY) → "Jan – Jun 2026" (because today is in the 2nd half of FY 2025 for this company — confirm correct period mapping with logic above)

**Test Data:** Four cadence configurations as above. Today = May 02, 2026.

**Expected Result:**
- Each company persists its config independently.
- Period boundaries align with the configured Fiscal Year Start, **not** the calendar year.
- Periods that cross a calendar-year boundary display both years in the label ("Sep 2026 – Jan 2027").
- Periods entirely within one calendar year use a single year stamp ("April – Aug 2026").
- Same calendar date (May 2, 2026) maps to different period labels across companies depending on their FY start and period length.
- Validation: Period Length cannot exceed 12 months; cannot be zero or negative (cross-ref SA-063F).

**Notes:** NEW REQUIREMENT — confirmed with Ashton (May 2026): Fiscal Year Start is required for **every** cadence frequency (monthly, quarterly, custom multi-month). Pairs with SA-063A (quarterly FY-start), SA-063B (monthly FY-start), SA-063D (tag reuse).

---

### SA-063D — AI auto-tags uploaded charts with the company's Review Cadence label (REUSE existing tag, no duplicates)

**Module:** File Upload | **Priority:** Critical

**Pre-conditions:** Company configured with Quarterly cadence, FY starts January, label "Q{quarter} {year}" (SA-063A done). Today's date sits in Q2 2026. **First upload batch** (no "Q2 2026" tag exists yet for this company).

**Steps:**
1. Upload Batch 1: 5 charts to that company today.
2. Wait for AI extraction.
3. Open Tags page (or Files area) and inspect the company's tag list — note the entry for "Q2 2026".
4. Open the Files area and inspect each file's tags. Filter by "Q2 2026".
5. **Upload Batch 2** (different chart set, same company, same day): 4 more charts.
6. Wait for AI extraction.
7. Re-open Tags page and inspect — count the number of "Q2 2026" tag entries.
8. Re-open the Files area. Filter by "Q2 2026" and count results.
9. Click into the "Q2 2026" tag and inspect the linked files.
10. Repeat with a third batch from a different Super Admin user (if multi-admin tests applicable).

**Test Data:** Batch 1 = 5 charts; Batch 2 = 4 charts; (optional) Batch 3 from another admin = 3 charts.

**Expected Result:**
- After Batch 1: a single "Q2 2026" tag entry is created on the company. Each of the 5 files carries that tag.
- After Batch 2: **the existing "Q2 2026" tag is REUSED** — no second/duplicate tag is created. Tags page shows exactly **one** "Q2 2026" entry. Files area filter by "Q2 2026" returns all 9 files (5 + 4).
- After Batch 3 (different admin, same day): still one "Q2 2026" entry, now with 12 files. Tag identity is per-company, not per-uploader.
- Tag is associated, not appended over existing tags — files keep their specialty tag too (Dental, Family, etc.).
- If a chart is uploaded on the boundary day (last day of Q2 vs first day of Q3), it picks up the cadence label valid at the upload timestamp — and reuses if that tag already exists for the company.

**Notes:** NEW REQUIREMENT — confirmed with Ashton (May 2026): tags must be **reused, not duplicated**. The cadence label uniquely identifies the period; multiple uploads in the same period attach to the same tag. Auto-tag uses the company's cadence config at upload time, not the chart's date-of-service. Form auto-selection lives in SA-063G; AI override behavior in SA-063H.

---

### SA-063E — AI auto-extracts specialty + provider name and tags accordingly

**Module:** File Upload | **Priority:** Critical

**Pre-conditions:** Company exists. Reviewers and providers seeded. Test charts include a Dental record for Dr. Sarah Chen, a Pediatric record for Dr. James Wong, a Family Medicine record for Dr. Maria Lopez.

**Steps:**
1. Upload the 3 charts in a single batch (no doctor pre-selected, no specialty pre-set).
2. Wait for AI extraction.
3. Open each file and inspect: tagged specialty, extracted provider first name, extracted provider last name.
4. Cross-check against the source PDFs.

**Test Data:** 3 charts as above.

**Expected Result:**
- Chart 1 → specialty tag "Dental", provider "Sarah Chen".
- Chart 2 → specialty tag "Pediatrics", provider "James Wong".
- Chart 3 → specialty tag "Family Medicine", provider "Maria Lopez".
- All three also carry the Review Cadence tag (e.g., "Q2 2026") from SA-063D.
- If AI cannot extract a value, the field is flagged for manual entry — Super Admin sees a "needs review" indicator on the file.

**Notes:** NEW REQUIREMENT — confirmed with Ashton (May 2026): on upload, AI must read specialty, provider first/last name, and tag the file with company's review-cadence label. Pairs with SA-063D.

---

### SA-063F — Review Cadence config blocks invalid combinations

**Module:** Companies | **Priority:** Medium

**Pre-conditions:** Company exists.

**Steps:**
1. Try to set Custom Frequency with Period Length = 0.
2. Try Period Length = 13 months (longer than a year).
3. Try saving with no Tag Label Format.
4. Try a label format with invalid placeholder syntax (e.g., "Q{quarter" missing close brace).

**Expected Result:** Each invalid case rejected with a clear validation error. Existing valid configurations not corrupted by failed save attempts.

**Notes:** NEW REQUIREMENT.

---

### SA-063G — AI auto-SELECTS the appropriate review form for each uploaded chart

**Module:** File Upload | **Priority:** Critical

**Pre-conditions:** Active company has at least 3 published forms across different specialties (e.g., a Dental form, a Pediatric form, a Family Medicine form). Active company-context established (per SA-063 Step 1). Test charts available: 1 Dental, 1 Pediatric, 1 Family Medicine.

**Steps:**
1. Upload all 3 charts in a single batch — leave the Form field BLANK on the upload form so AI is responsible for selection.
2. Wait for AI extraction.
3. Open each uploaded file and inspect the auto-selected Form.
4. Cross-check the AI's choice against each chart's content/specialty.
5. Inspect a chart where AI cannot confidently match a form (e.g., a chart whose specialty doesn't have a published form yet).
6. Bulk-upload 10 charts of mixed specialties and inspect form-selection accuracy across the batch.

**Test Data:** 3 single-specialty charts + 1 ambiguous chart + 10 mixed batch.

**Expected Result:**
- Chart 1 (Dental) → AI auto-selects the Dental form.
- Chart 2 (Pediatric) → AI auto-selects the Pediatric form.
- Chart 3 (Family Medicine) → AI auto-selects the Family Medicine form.
- For the ambiguous / no-match chart: form field is left blank with a "needs review" indicator. Super Admin must select manually before assignment can proceed.
- For the 10-chart batch: each file independently gets a form selection. No "first match wins" applied across the batch.
- AI form selection is editable — Super Admin can change the selected form before assigning the case (see SA-063H for override semantics).
- Only **published** forms are eligible for AI auto-selection. Drafts excluded.

**Notes:** NEW REQUIREMENT — confirmed with Ashton (May 2026): AI must auto-select the review form per chart based on content/specialty. Reduces manual work in upload flow. Pairs with SA-063E (specialty + provider extraction) and SA-063H (override rule).

---

### SA-063H — Anything AI auto-populates is editable; manual overrides persist

**Module:** File Upload | **Priority:** Critical

**Pre-conditions:** A batch of charts has been uploaded with AI auto-population enabled. AI has populated specialty, provider name, MRN, and form on each file. Active company context established.

**Steps:**
1. Open Chart A. Confirm AI populated: specialty, provider first/last name, form selection, and (for the reviewer's view) MRN.
2. Change the auto-extracted **provider name** to a different doctor. Save.
3. Change the auto-tagged **specialty** to a different one. Save.
4. Change the auto-selected **form** to a different published form. Save.
5. (At reviewer fill time) Change the AI-extracted **MRN** to a corrected value. Save.
6. Reload Chart A and confirm each manual override persists.
7. Trigger another AI extraction pass on Chart A (e.g., re-process button, or wait for a scheduled re-scan).
8. Confirm the manual overrides are NOT silently re-overwritten by the second AI pass.
9. Inspect Chart A's audit log / history.

**Test Data:** _(none beyond Chart A from a prior upload)_

**Expected Result:**
- Every AI-populated field is editable on the file detail screen: specialty, provider, form, MRN.
- Manual overrides save and persist after reload.
- A subsequent AI pass does NOT overwrite a field that has been manually edited. If AI flags new info, it shows as a suggestion (not a silent replacement).
- Audit log captures both the AI-suggested value and the human-overridden value with timestamps and actor (if implemented). At minimum, the human override is the final source of truth on the saved record.

**Notes:** NEW REQUIREMENT — confirmed with Ashton (May 2026): **anything AI auto-populates must be editable, and manual overrides must take precedence over AI.** General rule across the platform — applies to upload flow (SA-063D / SA-063E / SA-063G) and reviewer fill-time (PR-029 MRN, PR-036 MRN correction).

---

## File Upload (on behalf of Client)

> **Note:** The "Tasks" feature has been removed entirely (sidebar nav, dashboard panel, and Tasks page). Any earlier SA-006, SA-007, SA-061, SA-062 tests are intentionally deleted. If "Tasks" reappears in any UI, log a bug.


### SA-063 — Upload a batch of medical record PDFs (with Review Cadence auto-tagging + Batch Name auto-fill)

**Module:** File Upload (on behalf of Client) | **Priority:** Critical

**Pre-conditions:** Target company exists with Review Cadence configured (see SA-063A — e.g., Quarterly, FY-Jan). Today = May 02, 2026 (so the cadence label for an FY-Jan Quarterly company is "Q2 2026"). Super Admin is on the platform.

**Steps:**
1. **Establish the company context first.** Either:
   - (a) Log in using the company's generated client credentials (per SA-034) so the session is scoped to that company, OR
   - (b) From the SA Companies list, click into the target company and use the "Upload on behalf of" flow.
   - Whichever entry path is used, confirm the active company is shown in the header / breadcrumb before starting the upload.
2. Navigate to Upload File / Files.
3. **Leave Batch Name blank** — it will auto-populate from the company's Review Cadence after files are uploaded.
4. **Leave Doctor blank** — AI will auto-populate per file from chart content (see SA-063E).
5. **Leave Review Form blank** — AI will auto-select a published form per file (see SA-063G).
6. (Optional) Pick an existing Global ad-hoc tag (e.g., "Audit"). Leave the cadence-tag slot blank — AI auto-applies it (see SA-063D).
7. Drag and drop 5 PDFs (or click to browse).
8. Click Submit Reviews.
9. Wait for AI extraction to complete (status indicator).
10. Inspect the **Batch Name** field — it should now be auto-populated with the active company's current cadence label.
11. **Edit the Batch Name** to "Dental QA Test — May Run" (override the auto-fill). Save.
12. Reload the batch and confirm the override persists.
13. Open the batch and inspect each file's tags + metadata.

**Test Data:** 5 PDF files (mix of specialties — e.g., 2 Dental, 2 Family, 1 Pediatric). Active company = "Acme Health" (Quarterly, FY-Jan).

**Expected Result:** Toast: 'Files uploaded successfully'. Batch appears in Assignments list **for Acme Health** (not for any other company). Files visible in the Files area scoped to Acme Health.

- **Batch Name auto-populated** with the active company's cadence label after files are uploaded — for Acme Health on May 2, 2026 → "Q2 2026". (The Batch Name and the per-file cadence tag are the same identifier — they both come from the company's Review Cadence config; admin/user does not type one and then have AI add another.)
- Batch Name is **editable** — Step 11's override saves and persists. The cadence tag on each file (per SA-063D) stays separately attached even if the user renames the batch to something custom.
- AI extraction populates per file: (a) Specialty tag, (b) Provider first/last name, (c) auto-selected Form (SA-063G), (d) cadence tag scoped to the active company.
- If the active company in step 1 is wrong, every downstream tag, batch name, and assignment is wrong — that's why step 1 verifies the breadcrumb before the upload.
- Anything AI auto-populates is editable (cross-ref SA-063H).

See SA-063A through SA-063H for cadence configuration, AI extraction, and override semantics. See SA-052 / SA-053 for tag scope rules.

---

### SA-064 — Upload validation: files required; AI fields auto-fill or are flagged for review

**Module:** File Upload (on behalf of Client) | **Priority:** High

**Pre-conditions:** Same company-context flow as SA-063 (active company established before upload). At least 1 published form exists for the active company.

**Steps:**
1. Try to submit a batch with NO files attached — leave everything else blank too.
2. Try to submit with 1 file attached, but Batch Name explicitly cleared (was auto-populated, then user deleted the value). Save.
3. Upload 3 charts where AI cannot confidently extract Doctor (poor scan / handwritten). Submit.
4. Upload 3 charts where AI cannot match a published Form (specialty has no form). Submit.

**Test Data:** _(none)_

**Expected Result:**
- Step 1: blocked — at least 1 file must be attached. Validation error visible.
- Step 2: blocked OR Batch Name is auto-filled again from cadence on save — confirm rule with PM (recommended: re-fill from cadence rather than block, since the user likely just wants the default back).
- Step 3: submission succeeds; the affected files show a "needs review — Doctor" indicator. Super Admin must fill in Doctor manually before assignment can proceed.
- Step 4: submission succeeds; affected files show "needs review — Form" indicator. Super Admin selects the form manually.
- The only hard-required field at submit is **at least 1 file attached**. Doctor, Form, and Batch Name are AI-populated when possible and flagged when not.

**Notes:** Updated to reflect AI auto-fill model. Batch Name is no longer manually required — it auto-fills from cadence (SA-063). Doctor and Form are AI-populated (SA-063E, SA-063G) with manual fallback when AI fails.

---

### SA-065 — File expiration removes file from view after configured hours

**Module:** File Upload (on behalf of Client) | **Priority:** Medium

**Pre-conditions:** Batch uploaded; File Expiration set to a small value (1 hour) for test purposes.

**Steps:**
1. Wait the configured expiration period (or change system clock if test environment allows).
2. Re-open Files area.

**Test Data:** _(none)_

**Expected Result:** Expired files no longer viewable/downloadable from the UI. Verify with PM whether files are deleted from storage or just hidden.

---

### SA-066 — Upload non-PDF rejected

**Module:** File Upload (on behalf of Client) | **Priority:** Medium

**Pre-conditions:** —

**Steps:**
1. Try to upload a .txt or .exe file.

**Test Data:** _(none)_

**Expected Result:** Validation error: only PDF (or supported types) allowed.

---


## Assignments

### SA-067 — Manually assign batch to a Peer (baseline, no AI)

**Module:** Assignments | **Priority:** Critical

**Pre-conditions:** Unassigned batch exists. Peer dropdown only shows peers whose specialty matches the batch's specialty AND whose license is not expired (per SA-122) AND whose current load < Max Case Assignment.

**Steps:**
1. Open Assignments list.
2. Click Assign on a batch.
3. Inspect the peer dropdown — verify only eligible peers shown.
4. Select peer.
5. Click Assign Peer.

**Test Data:** _(none)_

**Expected Result:** Status badge changes from grey 'Assign' to green 'Assigned'. Peer's dashboard shows the new assignment. Ineligible peers (specialty mismatch / expired license / at max load) are filtered out of the dropdown — not just disabled.

**Notes:** Manual assignment is the baseline / fallback. AI auto-suggested assignments live in SA-067A..D; the same eligibility filters apply.

---

### SA-067A — AI auto-SUGGESTS peer assignments on file upload (specialty match + max-load aware)

**Module:** Assignments | **Priority:** Critical

**Pre-conditions:** Active company has Review Cadence configured. At least 5 peers seeded with varied specialties:
- Peer A: Dental, Max=20, current load=5
- Peer B: Dental, Max=10, current load=10 (at capacity)
- Peer C: Family Medicine, Max=30, current load=12
- Peer D: Pediatrics, Max=25, current load=0
- Peer E: Family Medicine, expired license

A batch of 8 charts is being uploaded: 3 Dental, 3 Family, 2 Pediatric.

**Steps:**
1. Upload the 8-chart batch (per SA-063).
2. Wait for AI extraction (specialty + provider per file populated per SA-063E).
3. Wait for AI assignment-suggestion pass.
4. Open Assignments list. Locate the new batch's files.
5. Inspect each file's status — should be **"Suggested: {Peer Name}"** rather than Assigned or Unassigned.
6. Inspect the suggestion logic per file:
   - Dental files → suggested to Peer A (only eligible Dental peer with capacity; Peer B at max).
   - Family files → suggested to Peer C (only eligible Family peer; Peer E excluded due to expired license).
   - Pediatric files → suggested to Peer D.
7. Verify Peer B receives no suggestions (at max).
8. Verify Peer E receives no suggestions (expired license).
9. Verify the dashboards of Peers A/C/D do NOT yet show the new cases — suggestions are not real assignments until SA approves (see SA-067B).

**Test Data:** As above.

**Expected Result:**
- Each file shows status "Suggested: {Peer Name}" with the AI's chosen peer visible.
- **Suggestion is computed per file, not per batch** — files within the same batch can be suggested to different peers when one peer hits max capacity (see SA-067I for the split-across-peers scenario).
- Suggestion algorithm respects: (a) specialty match between chart specialty and peer specialty (multi-specialty peers per SA-099 are eligible if any of their specialties matches), (b) peer's current load < Max Case Assignment (SA-073), (c) license not expired (SA-122), (d) peer is Active.
- Peers at max capacity or with expired licenses are skipped — their cases distribute to the next eligible peer per AI logic.
- Suggestions appear on the SA Assignments page with a clear visual indicator (badge / different color) distinguishing "Suggested" from "Assigned".
- Peer dashboards do NOT show suggested cases yet — only after SA approval.

**Notes:** NEW REQUIREMENT — confirmed with Ashton (May 2026): AI must auto-suggest peer assignments at upload time based on specialty match + max-load. Suggestions are per-file; a single batch can split across multiple peers (SA-067I). Super Admin must approve before suggestions become real assignments. Capacity math is `free slots = Max − current load` where load = Assigned + In-Progress only (Suggested does NOT count) — see canonical rule in SA-074. Pairs with SA-099 (peer multi-specialty), SA-073 (max load), SA-122 (license expiry block), SA-067I (batch split), SA-074 / SA-074A (capacity rule).

---

### SA-067B — Super Admin APPROVES AI-suggested assignments (single + bulk)

**Module:** Assignments | **Priority:** Critical

**Pre-conditions:** SA-067A complete — 8 files have AI-suggested assignments.

**Steps:**
1. Open Assignments list.
2. Filter view to "Suggested" status only.
3. Click "Approve" on a single suggested file.
4. Verify the suggested peer's dashboard now shows the case.
5. Select 5 more suggested files via checkboxes.
6. Click "Bulk Approve".
7. Verify each suggested peer now has the corresponding case on their dashboard.
8. Open the affected peers' dashboards directly to confirm.

**Expected Result:**
- Single approval flips one file from Suggested → Assigned. Peer's dashboard updates immediately (or on next refresh).
- Bulk approval flips all 5 selected files. Each goes to the AI-suggested peer (not all to one peer).
- Approved files show the same status badge as manually assigned files (green "Assigned").
- Audit log captures: who approved, when, and which AI suggestion was approved (suggestion → final assignment trail).

**Notes:** NEW REQUIREMENT.

---

### SA-067C — Super Admin OVERRIDES AI suggestion before approving

**Module:** Assignments | **Priority:** Critical

**Pre-conditions:** SA-067A complete. SA wants to assign a Dental file to a different peer than the one AI suggested.

**Steps:**
1. Open Assignments list, filter to Suggested.
2. Click on a suggested file (currently suggested to Peer A).
3. Open the peer-selector dropdown.
4. Verify the dropdown shows all eligible peers (specialty match + capacity + license valid), with the AI's suggestion marked / pre-highlighted.
5. Pick a different eligible peer (e.g., a second Dental peer hired since suggestion ran).
6. Click Approve / Confirm.
7. Verify the override peer now sees the case; the originally suggested peer does not.
8. Try to override to an INELIGIBLE peer (specialty mismatch, or expired license).

**Expected Result:**
- Override succeeds when the new peer is eligible.
- Ineligible peers are filtered out of the override dropdown (consistent with SA-067 manual assignment).
- Audit log captures: original AI suggestion, SA override decision, final assignment.

**Notes:** NEW REQUIREMENT.

---

### SA-067D — Super Admin REJECTS AI suggestion (sends back to manual queue)

**Module:** Assignments | **Priority:** High

**Pre-conditions:** SA-067A complete. SA wants to skip AI suggestion entirely for one file.

**Steps:**
1. Open Assignments list, filter to Suggested.
2. Click "Reject Suggestion" on a file.
3. Verify file status returns to Unassigned.
4. Verify the file appears in the standard manual-assignment queue.
5. Manually assign per SA-067.

**Expected Result:** Rejected file goes back to Unassigned status. AI does not re-suggest the same peer (or if it does, the SA's prior rejection is captured in audit log so behavior is deterministic — confirm rule with PM).

**Notes:** NEW REQUIREMENT.

---

### SA-067E — Single ASSIGNMENTS index page (search, filter, drill-in)

**Module:** Assignments | **Priority:** Critical

**Pre-conditions:** Mix of files in every status: Unassigned, Suggested, Assigned, In-Progress, Completed, Returned (from peer self-unassign per PR-030).

**Steps:**
1. Click Assignments in sidebar.
2. Inspect default view.
3. Test filters: Status (multi-select), Peer (search), Company, Specialty, Date Range, Cadence Tag.
4. Test search by file name / batch name / MRN / provider name.
5. Click a file row.
6. Verify drill-in shows: file detail, current peer, assignment history (chronological — every assign / reassign / unassign with timestamp + actor + reason).
7. Sort by Date Assigned, by Status, by Peer.
8. Paginate through 100+ assignments.

**Expected Result:**
- One page lists ALL assignments across statuses — single source of truth.
- Filters work additively (status=Assigned + peer=Dr. Chen = only Dr. Chen's active cases).
- Search returns matches across file/batch/MRN/provider in one query.
- Drill-in shows full assignment history for every case (helpful for audit when reassignments happen).
- Pagination handles large datasets without slowdown.

**Notes:** NEW REQUIREMENT — Ashton wants one page to see every assignment, not split between "Unassigned queue" and "Per-peer dashboards."

---

### SA-067F — REASSIGN an Assigned case from the Assignments page

**Module:** Assignments | **Priority:** Critical

**Pre-conditions:** Case currently Assigned to Peer X (not started yet). Eligible alternative peers exist.

**Steps:**
1. Open Assignments page.
2. Locate the case (filter by Peer = Peer X).
3. Click Reassign.
4. Pick a new eligible peer.
5. (Optional) Enter reason.
6. Confirm.
7. Verify the case appears on new peer's dashboard.
8. Verify the case is gone from Peer X's dashboard.
9. Inspect assignment history on the case detail.

**Expected Result:**
- Case successfully transferred. Old peer no longer sees it; new peer does.
- Reassignment is tracked: original peer, new peer, timestamp, actor (SA), optional reason.
- If the case was In-Progress (peer started but didn't submit), confirm with PM whether the in-progress draft transfers, is discarded, or blocks reassignment.

**Notes:** NEW REQUIREMENT — extends SA-068 with explicit reassignment from the index page (not just from the case-detail screen). Pairs with SA-070 (cannot reassign Completed).

---

### SA-067G — UNASSIGN a case (peer removed, status reverts to Unassigned)

**Module:** Assignments | **Priority:** High

**Pre-conditions:** Case Assigned to Peer Y (not started).

**Steps:**
1. Open Assignments page.
2. Find the assigned case.
3. Click Unassign.
4. (Optional) Enter reason.
5. Confirm.
6. Verify case status flips to Unassigned.
7. Verify case is removed from Peer Y's dashboard.
8. Verify case appears in the Unassigned queue and is eligible for AI re-suggestion or manual reassign.

**Expected Result:**
- Case successfully unassigned. Status = Unassigned.
- Audit log captures: prior peer, who unassigned, when, reason.
- Case is eligible for re-suggestion / reassignment (no permanent block).
- If case was In-Progress, confirm with PM whether unassign is allowed and what happens to the draft.

**Notes:** NEW REQUIREMENT — distinct from Reassign (Reassign = Peer X → Peer Y in one step; Unassign = Peer X → none).

---

### SA-067H — Super Admin reviews PEER-RETURNED cases with the peer's comment

**Module:** Assignments | **Priority:** Critical

**Pre-conditions:** A peer has self-unassigned a case via PR-030 with a comment ("This is an OB-GYN chart, not Family"). Case status = "Returned by Peer".

**Steps:**
1. Login as Super Admin.
2. Open Assignments page.
3. Filter by status "Returned by Peer".
4. Locate the kicked-back case.
5. Verify the peer's comment is visible inline on the case row (or via a hover / click-to-expand).
6. Click the case row to drill in.
7. Inspect the case detail — verify the comment is shown clearly with attribution: which peer returned it, when, and the full reason text.
8. Inspect assignment history — verify the original assignment + the kick-back are both captured.
9. Take action: reassign the case to a different peer (per SA-067F) OR send back to AI suggestion (per SA-067D-style flow).
10. Confirm the comment from the peer is preserved in the audit log even after the case is reassigned and completed.

**Expected Result:**
- Returned-by-Peer cases are easy to find via dedicated filter or status group on the Assignments page.
- Peer's comment is visible on the row (truncated if long, expandable on click) AND on the case detail screen in full.
- Comment attribution is clear: "Returned by {Peer Name} on {Date}: {Comment}".
- Comment persists across subsequent reassignments — visible in audit history even after the case is completed by a different peer.
- SA can see ALL kick-back comments for a peer (helpful when reviewing whether a peer kicks back too often) and ALL kick-back comments for a company (helpful when AI suggestions are systematically wrong for that company).

**Notes:** NEW REQUIREMENT — confirmed with Ashton (May 2026): peer kick-back comments must be visible to SA. They are valuable for: (a) catching systemic AI mis-suggestions, (b) flagging peers who kick back excessively, (c) audit. Pairs with PR-030 (peer side) and SA-067E (Assignments index).

---

### SA-067I — Files within a batch SPLIT across multiple peers when capacity is hit

**Module:** Assignments | **Priority:** Critical

**Pre-conditions:** Active company with Review Cadence "Jan 2026" or similar. Three Dental peers seeded:
- Peer D1: Dental, Max=10, current load=0 (10 slots free)
- Peer D2: Dental, Max=15, current load=8 (7 slots free)
- Peer D3: Dental, Max=20, current load=5 (15 slots free)

A batch of **30 Dental files** is being uploaded.

**Steps:**
1. Upload the 30-file Dental batch (per SA-063 — single batch, single upload action).
2. Wait for AI extraction (specialty per file, provider, etc.).
3. Wait for AI assignment-suggestion pass.
4. Open Assignments page.
5. Filter by the new batch / cadence tag "Jan 2026".
6. Inspect each file's suggested peer.
7. Group results by suggested peer and count.
8. Verify totals: D1 + D2 + D3 = 30. No file unassigned (since total capacity 10 + 7 + 15 = 32 ≥ 30).
9. Sub-scenario: bring a 4th batch where total Dental demand exceeds total capacity (e.g., 35 files when only 32 slots free). Inspect what happens to the overflow 3 files.

**Test Data:** 30 Dental files in one batch. Sub-scenario: 35 Dental files when only 32 slots free.

**Expected Result:**
- The single batch's 30 files are split across the 3 Dental peers per their available capacity:
  - Peer D1: suggested 10 files (fills to Max=10).
  - Peer D2: suggested 7 files (fills to Max=15).
  - Peer D3: suggested 13 files (well under Max=20; remaining 30 − 10 − 7 = 13).
- Or any equivalent distribution that respects each peer's max — the rule is **no peer exceeds max**, total = batch size, and the algorithm fills earliest-available slots first (or round-robin — confirm with PM which is preferred).
- A batch is NOT a single assignment unit — assignment is **per file**. The same batch can have files assigned to different peers.
- The Assignments page shows each file as an independent row with its own suggested peer — not a single batch row collapsed under one peer.
- Sub-scenario (35 files, 32 slots): 32 files get suggested across the 3 peers; the remaining 3 files stay in Unassigned status with a clear flag like "No eligible peer with capacity." SA can either: wait for capacity to free up (after another peer completes work), increase a peer's max, or onboard another Dental peer.
- After SA approves all 32 suggestions (per SA-067B), each peer's dashboard shows their slice of the batch (D1: 10, D2: 7, D3: 13).
- Audit log on the batch shows: 30 files, distributed to 3 peers, with the count per peer.

**Notes:** NEW REQUIREMENT — confirmed with Ashton (May 2026): if a batch has 30 Dental files and a Dental peer's max is 10, only 10 go to that peer; the next 10+ go to other Dental peers. Files within a batch can split across peers — the batch is an upload container, not an assignment unit. Capacity math (`free slots = Max − current load`) is canonical in SA-074. Pairs with SA-073 (Max Case Assignment), SA-074 / SA-074A (capacity rule + edge cases), SA-067A (AI suggestions).

---

### SA-068 — _SUPERSEDED by SA-067F_

**Module:** Assignments | **Priority:** —

**Pre-conditions:** Assigned (not yet completed) assignment exists.

**Steps:**
1. Open assignment.
2. Click Reassign.
3. Pick a different peer.
4. Confirm.

**Test Data:** _(none)_

**Expected Result:** _Test superseded — do not run. Replaced by SA-067F which tests reassignment from the new Assignments index page with full audit history._

**Notes:** SUPERSEDED — kept as a placeholder so test IDs don't shift.

---

### SA-069 — Bulk assign multiple batches

**Module:** Assignments | **Priority:** High

**Pre-conditions:** Multiple unassigned batches.

**Steps:**
1. Select multiple batches via checkboxes.
2. Choose Bulk Assign.
3. Pick peer.
4. Confirm.

**Test Data:** _(none)_

**Expected Result:** All selected batches assigned to that peer. Status badges update. Peer dashboard count increases by N.

---

### SA-070 — Cannot reassign a Completed review

**Module:** Assignments | **Priority:** Medium

**Pre-conditions:** Completed assignment exists.

**Steps:**
1. Try to reassign a completed item.

**Test Data:** _(none)_

**Expected Result:** Reassign disabled or warns user. Completed work is immutable.

---


## Reports — Cross Check

### SA-071 — Provider Highlights numbers match raw review data

**Module:** Reports — Cross Check | **Priority:** Critical

**Pre-conditions:** Known reviews with known scores for one provider.

**Steps:**
1. Note: Provider X has 3 completed reviews with scores 100, 100, 80 in Q4 2025.
2. Generate Provider Highlights for that range.
3. Find Provider X.

**Test Data:** _(none)_

**Expected Result:** Provider X shows 'Total Measures Met: ~93%' (or correct math). Verify with example PDF format from project files.

---

### SA-072 — Specialty Highlights aggregates correctly

**Module:** Reports — Cross Check | **Priority:** Critical

**Pre-conditions:** Known data per specialty.

**Steps:**
1. Generate Specialty Highlights.
2. Manually compute average for one specialty (e.g., GYN: avg of all GYN review scores in range).

**Test Data:** _(none)_

**Expected Result:** Reported specialty score = manually computed average (within rounding).

---


## NEW TEST CASES BELOW — Added from May 2026 review of Detailed_requirements.docx + Peerspectiv AI Review.docx


## Peers — Additional (from review)

### SA-073 — Max Case Assignment field on Peer profile

**Module:** Peers | **Priority:** High

**Pre-conditions:** Logged in as Super Admin. At least 1 Peer exists.

**Steps:**
1. Navigate to Peers > select an existing Peer > Edit.
2. Locate Max Case Assignment field.
3. Enter a value (e.g., 30 for Dr. Yance, 200 for Dr. Schrader).
4. Save.
5. Reopen the peer and verify the value persisted.

**Test Data:** Max values to test: 30, 75, 100, 200

**Expected Result:** Max Case Assignment field is visible, accepts integer values, saves correctly, and is shown on Peer profile after reload.

---

### SA-074 — Auto-assignment respects Max Case Assignment (capacity = Max − current load)

**Module:** Peers | **Priority:** High

**Pre-conditions:** Peer A has Max=30 with 0 active. Peer B has Max=200 with 19 active. 200 unassigned cases of matching specialty exist.

**Steps:**
1. Trigger auto-assignment for the 200 cases.
2. Verify the distribution.

**Test Data:** _(none)_

**Expected Result:** Peer A receives no more than 30 cases (Max=30, load=0 → 30 free slots). Peer B receives no more than 81 cases (Max=200, load=19 → 200−19 = 181 free slots, but the test asserts Peer B's actual share given other peers competing — for this 200-case pool, Peer B gets at most 81 if round-robin balances against Peer A's 30 contribution; otherwise up to 181). Remaining cases distributed via round-robin to other matching peers respecting their max.

**Capacity rule (canonical — referenced by SA-067A, SA-067I, SA-074):**
- `free slots = Max Case Assignment − current load`
- `current load` = count of cases the peer is **actively responsible for**, defined as the union of:
  - **Assigned** (approved by SA, sitting in peer's queue, not started)
  - **In-Progress** (peer started reviewing but not yet submitted)
- `current load` does **NOT** include:
  - **Completed** cases (peer is done, capacity returns immediately on submit).
  - **Returned by Peer** (kicked back via PR-030, no longer the peer's responsibility).
  - **Suggested** cases not yet approved by SA (because they're not real assignments yet — SA might override or reject).
- A peer at `current load == Max` is filtered out of all assignment selectors and AI suggestions.
- A peer with `current load > Max` (possible if Max was lowered after assignments were already made) is also filtered out until load drops below Max.

**Notes:** Capacity math made explicit May 2026. Cross-ref SA-067A (AI suggestion eligibility) and SA-067I (batch split across peers).

---

### SA-074A — Capacity math edge cases (Suggested excluded, Completed frees capacity, Max lowered)

**Module:** Peers / Assignments | **Priority:** High

**Pre-conditions:** Active company. One Dental peer "Dr. X" with Max Case Assignment = 10.

**Steps:**

**Edge case 1 — Suggested cases do NOT count toward load:**
1. Dr. X has 8 Assigned + 2 In-Progress cases (load = 10 — at max).
2. Upload a new batch where AI would otherwise suggest Dr. X. Verify suggestion is BLOCKED — AI skips Dr. X because load = Max.
3. Reset: bring Dr. X to 6 Assigned + 0 In-Progress (load = 6).
4. Upload a batch large enough that AI suggests 5 cases for Dr. X (potential Suggested = 5, current load still 6).
5. Inspect Dr. X's effective load. **It should still be 6**, not 11 (Suggested cases don't count until SA approves them).
6. Upload a SECOND batch immediately after, before SA approves the first round of suggestions. AI should still consider Dr. X to have 4 free slots (10 − 6), not 0 (since Suggested doesn't count).
7. SA approves the 5 suggestions from step 4. Dr. X's load is now 11 — wait, that's over Max. Verify behavior: confirm with PM whether (a) approvals beyond Max are blocked at SA-067B approval time, OR (b) Max is treated as a soft target during suggestion but enforced strictly at approval.

**Edge case 2 — Completed cases free capacity immediately:**
1. Dr. X has 10 Assigned cases (at max).
2. Dr. X completes 3 reviews — submits them.
3. Verify load drops to 7 immediately on submit (not on next cron / page refresh).
4. Upload a batch with a Dental file. Verify Dr. X is eligible again (3 free slots).

**Edge case 3 — Returned by Peer (kick-back) frees capacity:**
1. Dr. X has 10 Assigned cases (at max).
2. Dr. X returns 2 cases via PR-030 self-unassign with reason.
3. Verify Dr. X's load drops to 8 immediately.
4. Verify the 2 returned cases are NOT counted against Dr. X anywhere (load math, payments, audit clarity).

**Edge case 4 — Max lowered while load is high:**
1. Dr. X has 10 Assigned cases (at Max=10).
2. SA edits Dr. X's profile and lowers Max to 5. Save.
3. Verify the existing 10 cases stay assigned (not auto-revoked).
4. Verify Dr. X is filtered out of new-assignment selectors until load drops to 4 or below.
5. Confirm Dr. X cannot receive new suggestions even though Max=5 — because current load > Max.

**Edge case 5 — Max raised:**
1. Dr. X at Max=10, load=10.
2. SA raises Max to 20.
3. Verify Dr. X is immediately eligible for new assignments (10 free slots).

**Test Data:** _(none beyond the 5 scenarios above)_

**Expected Result:**
- Edge case 1: Suggested cases do NOT consume capacity. Two consecutive batches can both suggest Dr. X without double-counting. Confirm approval-time enforcement with PM.
- Edge case 2: Capacity returns on review submission, not on cron.
- Edge case 3: Returned-by-peer cases drop load immediately and don't reappear in any peer-payment / capacity calc.
- Edge case 4: Lowered Max doesn't auto-revoke existing assignments but blocks new ones until load < new Max.
- Edge case 5: Raised Max immediately makes the peer eligible without needing another action.

**Notes:** NEW REQUIREMENT — capacity rule edge cases that are easy to get wrong. Pairs with the canonical capacity rule in SA-074's Notes block. Open question for PM: how should approval beyond Max be handled (block vs allow soft over-cap)?

---

### SA-075 — AI form upload auto-creates a Peer from enrollment form

**Module:** Peers | **Priority:** High

**Pre-conditions:** Logged in as Super Admin. A filled-out reviewer enrollment form (PDF or screenshot of monday.com form) is available.

**Steps:**
1. Navigate to Peers > Add Peer (or "Upload Enrollment Form" entry point).
2. Upload the filled enrollment form file.
3. Wait for AI extraction.
4. Review the auto-populated fields.
5. Save.

**Test Data:** Sample filled form with: First Name, Last Name, Email, License #, License State, Specialty, NPI, Max Case Load

**Expected Result:** AI extracts and pre-populates all available fields on the new Peer profile. New Peer is created in **Pending Credentialing** state (per the state machine in SA-022B / SA-031E) — same outcome as the manual Add Peer flow (SA-022).

---

### SA-076 — Configure pay model per peer (per-case / hourly / per-minute)

**Module:** Peers | **Priority:** Medium

**Pre-conditions:** At least 1 Peer exists.

**Steps:**
1. Open a Peer profile.
2. Locate Pay Model setting.
3. Switch between per-case ($35), hourly, per-minute.
4. Save.
5. Generate that peer's earnings report.

**Test Data:** _(none)_

**Expected Result:** Pay model selector saves per peer. Earnings report calculates totals using the chosen model.

---

### SA-077 — Auto-approve reviewer payments at end of month

**Module:** Peers | **Priority:** High

**Pre-conditions:** Settings has end-of-month auto-approve enabled. Multiple peers have completed reviews in the period.

**Steps:**
1. Wait for / simulate end-of-month trigger.
2. View payments page.

**Test Data:** _(none)_

**Expected Result:** All eligible peer payments are auto-approved and marked Paid. Records show timestamp and approver = "system".

---

### SA-078 — End-of-month payment cycle handles weekend cutoff (last Thursday rule)

**Module:** Peers | **Priority:** High

**Pre-conditions:** Test against three calendar months: one where the 1st falls on a weekday, one where the 1st falls on Saturday, one where the 1st falls on Sunday.

**Steps:**
1. **Weekday-1st month:** Verify payment release is scheduled for the second-to-last business day so ACH lands by the 1st.
2. **Saturday-1st month:** Verify payment release is scheduled for the **last Thursday** of the prior month so funds land Friday.
3. **Sunday-1st month:** Same as Saturday — last Thursday of the prior month.
4. For each month, verify the cases-counted-through cutoff date.

**Test Data:** Pick representative months — e.g., a month where the 1st is a Tue, one where it's a Sat, one where it's a Sun.

**Expected Result:**
- Default (1st falls Mon–Fri): payments released on the second-to-last business day so ACH posts by the 1st.
- 1st falls on Saturday or Sunday: payments released on the **last Thursday** of the prior month so peers are paid on Friday (avoids weekend gap).
- Cutoff cases-counted-through date aligns with the configured rule and is visible on the payment summary.

**Notes:** Confirmed with Ashton (May 2026): when the 1st is a weekend, pay on the last Thursday so peers are paid on Friday.

---

### SA-079 — ADP / ACH integration triggers payment file

**Module:** Peers | **Priority:** Low

**Pre-conditions:** ADP integration credentials configured.

**Steps:**
1. Trigger end-of-month payment.
2. Check ADP for the imported batch.

**Test Data:** _(none)_

**Expected Result:** Payment data exports to ADP (or generates compatible file) without manual re-entry. 1099 contractor classifications preserved.

---


## Companies — Additional (from review)

### SA-080 — Invoice case-count EDIT + REGENERATE with new count

**Module:** Companies | **Priority:** High

**Pre-conditions:** A generated invoice exists. Original system count = 102 reviews. Correct billable count should be 100 (2 were duplicates Peerspectiv reviewed by mistake).

**Steps:**
1. Open the generated invoice.
2. Click Edit / Adjust on the case-count cell.
3. Change quantity from 102 to 100.
4. Save.
5. Click "Regenerate Invoice".
6. Inspect the regenerated PDF.
7. Re-open the invoice and confirm the persisted count is 100.

**Test Data:** Original count 102 → adjusted count 100. Original total at $100/review = $10,200. Adjusted total = $10,000.

**Expected Result:**
- Case-count field is editable directly on the invoice. Numeric only; rejects negative or non-numeric.
- After save, total recalculates automatically (100 × rate).
- "Regenerate Invoice" produces a new PDF that reflects the adjusted count and adjusted total.
- Regenerated invoice retains the same invoice number (or appends a version suffix — confirm with PM).
- Original count + adjusted count + reason-for-change captured in audit log.
- Old PDF version remains accessible for historical reference.

**Notes:** Confirmed with Ashton (May 2026): user must be able to edit the number of cases reviewed during invoice generation, then regenerate the invoice with the corrected count.

---

### SA-081 — Itemized invoice option (provider + count, no PHI)

**Module:** Companies | **Priority:** Medium

**Pre-conditions:** Company has had multiple providers reviewed in the billing period.

**Steps:**
1. Generate invoice with Itemized option enabled.
2. Inspect the PDF.

**Test Data:** e.g., 5 providers x 3-5 cases each

**Expected Result:** PDF shows each provider name + count of reviews for that provider. NO patient names, MRNs, or any PHI shown.

---


## Forms — Additional (from review)

### SA-082 — Default Value per question (correct answer configurable)

**Module:** Forms | **Priority:** High

**Pre-conditions:** Logged in as Super Admin. Form Builder open.

**Steps:**
1. Add a Yes/No/NA question.
2. Set Default Value = Yes.
3. Add another question, set Default Value = No (e.g., "Should medical director be notified?" - the wrong answer is Yes).
4. Save form.
5. Take the review.

**Test Data:** _(none)_

**Expected Result:** Each question stores a Default Value. The non-default answer triggers the "additional response" text requirement (replaces the current "no triggers text" rule).

---

### SA-083 — Required text response when Default Value is NOT chosen

**Module:** Forms | **Priority:** High

**Pre-conditions:** Form has a question with Default Value = Yes and "Require additional response if not default" toggle ON.

**Steps:**
1. As Peer, open the review.
2. Answer No (or any non-default).
3. Try to submit without typing in the text box.

**Test Data:** _(none)_

**Expected Result:** Submission blocked with error: text required. NA does NOT trigger the requirement (NA is always neutral).

---


## Settings — Additional (from review)

### SA-084 — File retention configurable in days (not just hours)

**Module:** Settings | **Priority:** High

**Pre-conditions:** Logged in as Super Admin. Navigate to Settings.

**Steps:**
1. Locate File Expiration setting.
2. Verify unit is days (not hours).
3. Set value to 90.
4. Save.
5. Upload a test file.
6. Verify metadata shows expiration 90 days from upload.

**Test Data:** _(none)_

**Expected Result:** Setting accepts days value. Default value is 90. File expiration date stamped correctly on upload.

---

### SA-085 — Files deleted from live system after retention but kept for AI/reporting behind firewall

**Module:** Settings | **Priority:** Medium

**Pre-conditions:** A file with retention date passed exists.

**Steps:**
1. Wait for / simulate retention expiry.
2. As any user, attempt to view the file in the live UI.
3. Run an AI trends query that should reference historical data.

**Test Data:** _(none)_

**Expected Result:** File no longer accessible in live UI. Data still queryable by AI/reporting layer (behind firewall) for trend analysis.

---


## Tags — Additional (from review)

### SA-086 — Cadence tags auto-generated per company by Review Cadence

**Module:** Tags | **Priority:** Medium

**Pre-conditions:** Two companies with different Review Cadences. Company A: Quarterly, FY-Jan. Company B: Quarterly, FY-April. Today = May 02, 2026.

**Steps:**
1. Open Upload File flow for Company A without manually creating a tag. Inspect the Tag dropdown.
2. Open Upload File flow for Company B without manually creating a tag. Inspect the Tag dropdown.
3. Inspect the Tags page filtered to "All companies".

**Expected Result:**
- Company A's upload dropdown auto-suggests "Q2 2026" (Apr–Jun for FY-Jan).
- Company B's upload dropdown auto-suggests "Q1 2026" (Apr–Jun for FY-April).
- Same calendar date produces different cadence tags for different companies — confirmed in Tags page where both labels coexist as separate scoped records.
- Manual tag creation is still allowed for ad-hoc back-log (creates a Global tag per SA-053).
- Cadence tags are reused for subsequent uploads in the same period (per SA-063D).

**Notes:** Replaces the prior calendar-quarter-only model. Cadence-tag generation is driven by each company's Review Cadence config (SA-063A/B/C), not by the system date alone.

---


## Assignments — Additional (from review)

### SA-087 — Auto-assignment uses round-robin + max load + workload balancing

**Module:** Assignments | **Priority:** High

**Pre-conditions:** Multiple peers in same specialty with different Max Case Assignment and current loads. New batch uploaded.

**Steps:**
1. Upload a batch.
2. Click Auto-Assign.
3. Inspect assignments.

**Test Data:** _(none)_

**Expected Result:** Each peer receives no more than (Max - current load). Distribution prefers peers with lowest current active workload first. AI shows e.g. "85% match: this reviewer is family medicine, 0 active cases".

---

### SA-088 — Bulk drag-and-drop upload auto-detects specialty by filename

**Module:** Assignments | **Priority:** Medium

**Pre-conditions:** Folder of mixed-specialty cases (e.g., Family_Smith_1.pdf, Dental_Jones_1.pdf, Psych_Doe_1.pdf).

**Steps:**
1. Drag the entire folder onto Upload Files.
2. Wait for processing.

**Test Data:** _(none)_

**Expected Result:** System reads filename prefix and groups files into separate batches by specialty. Each batch is named "<Specialty> <ProviderName>".

---

### SA-089 — Approve All / Override before commit on auto-assignment

**Module:** Assignments | **Priority:** High

**Pre-conditions:** Auto-assignment has run on a new batch but has not been finalized.

**Steps:**
1. Inspect proposed assignments.
2. Uncheck one assignment, manually reassign to a different peer.
3. Click Approve All.

**Test Data:** _(none)_

**Expected Result:** Manual override is honored. All other proposed assignments commit. Toast confirms.

---

### SA-090 — Provider name disambiguation when first/last match

**Module:** Assignments | **Priority:** Medium

**Pre-conditions:** Two providers exist in the same company with name "John Smith".

**Steps:**
1. Upload a case file named "Family_Smith_1.pdf".
2. Observe the doctor selection in batch creation.

**Test Data:** _(none)_

**Expected Result:** System prompts for disambiguation OR uses additional data (middle name if available, NPI, etc.) to differentiate. Tester is not forced to enter middle name on every upload.

---

### SA-091 — Email auto-notification to reviewer on case assignment

**Module:** Assignments | **Priority:** High

**Pre-conditions:** Reviewer email configured. SMTP working.

**Steps:**
1. Assign a batch to a reviewer.
2. Check the reviewer's inbox.

**Test Data:** _(none)_

**Expected Result:** Email sent automatically (NOT encrypted; no PHI in body). Body includes: doctor name being reviewed, # of cases, due date (default 7 days), portal link.

---

### SA-092 — Auto-reminder email when reviewer cases past due

**Module:** Assignments | **Priority:** High

**Pre-conditions:** A reviewer has at least 1 case past the 7-day due date.

**Steps:**
1. Check reviewer inbox.
2. Verify reminder email content.

**Test Data:** _(none)_

**Expected Result:** Reminder email automatically sent at past-due threshold. Includes case count, days late, portal link. No PHI.

---


## Reports — Additional (from review)

### SA-093 — Quality Certificate selectable by quarter

**Module:** Reports | **Priority:** High

**Pre-conditions:** A company has reviews completed across multiple quarters.

**Steps:**
1. Reports > Quality Certificate.
2. Select Q3 2026.
3. Generate.

**Test Data:** _(none)_

**Expected Result:** Generated certificate scoped only to Q3 2026 reviews. Period dates correct on the certificate.

---

### SA-094 — Download All / zip export bundles all client deliverables

**Module:** Reports | **Priority:** Medium

**Pre-conditions:** Quarter end. All reviews completed for a company.

**Steps:**
1. Reports > Download All for Q3 2026.
2. Inspect the downloaded zip.

**Test Data:** _(none)_

**Expected Result:** Zip contains: completed peer reviews folder, corrective action plans folder, quality certificate, and summary reports — separated into folders.

---

### SA-095 — Question Analytics displays in descending fail-rate order

**Module:** Reports | **Priority:** Medium

**Pre-conditions:** Reviews completed for a form with mixed Yes/No answers.

**Steps:**
1. Generate Question Analytics report.

**Test Data:** _(none)_

**Expected Result:** Questions are listed worst-performing on top (highest No %), best-performing on bottom (or NA-only). Default sort is descending by % missed.

---

### SA-096 — Provider Scorecard shows quarter-over-quarter comparison

**Module:** Reports | **Priority:** Medium

**Pre-conditions:** A provider has reviews across at least 3 quarters.

**Steps:**
1. Generate Provider Scorecard for the latest quarter.

**Test Data:** _(none)_

**Expected Result:** Scorecard PDF (landscape orientation) shows current quarter score AND previous 2-3 quarters' scores at the top of each provider's page for easy trend comparison.

---

### SA-096A — Reviewer / Peer Scorecard (per-reviewer performance dashboard)

**Module:** Reports | **Priority:** High

**Pre-conditions:** Active reviewer "Dr. Chen" with at least one full Review Cadence period of activity (e.g., Q1 2026). The reviewer has:
- Completed reviews across multiple specialties.
- Some on-time submissions and at least one late submission.
- At least one kick-back (self-unassigned via PR-030).
- Earnings recorded for the period.
- Cross-cadence-period history exists so trend comparison works (at least 2-3 prior periods).

**Steps:**
1. Login as Super Admin.
2. Open Peers > select Dr. Chen > "Scorecard" tab (distinct from "Assigned Reviews" SA-025 and "Earnings Report" SA-026).
3. Select cadence period = Q1 2026.
4. Inspect the scorecard.
5. Verify each of the six metric tiles is present and computed correctly.
6. Click into trend / comparison view (current period vs prior 2-3 periods).
7. Try to download / export the scorecard as PDF.
8. **Switch persona:** login as Dr. Chen.
9. Navigate to own Profile > "My Scorecard" (read-only).
10. Verify Dr. Chen sees the same six metrics for their own data.
11. Try to access another reviewer's scorecard via URL manipulation.
12. **Switch persona:** login as Client and confirm scorecard endpoint is blocked.

**Test Data:** Q1 2026 period for Dr. Chen, with seeded data covering all six metrics.

**Expected Result:** Scorecard displays six metric tiles for the selected cadence period:

1. **Volume** — # reviews completed in period. Breakdown by specialty if reviewer is multi-specialty (per SA-099).
2. **Turnaround time** — avg days from SA-067B approval (when the case landed in Dr. Chen's queue) to submission. Plus % of reviews submitted on time vs late (definition of "on time" per SA-092 reminder cadence; confirm SLA threshold with PM).
3. **Quality / accuracy** — % of Dr. Chen's calls that align with consensus or supervisor spot-checks. Source: confirm with PM whether spot-checks are stored on the review record or in a separate audit trail. If no spot-check data exists yet, the tile shows "Insufficient data" rather than a misleading 100%.
4. **Kick-back rate** — % of cases Dr. Chen self-unassigned via PR-030, with reasons summarized (e.g., "specialty mismatch: 3 / wrong patient type: 1"). Threshold guidance shown (e.g., highlighted red if > 10%).
5. **Specialty mix** — pie chart or bar list of specialties Dr. Chen actually reviewed in the period. Helps SA detect if the assignment engine is sending out-of-specialty work or if multi-specialty peers are being underused for one specialty.
6. **Earnings summary tile** — read-only echo of SA-026 (count × rate = total) for the period. Click-through navigates to the full Earnings Report. The scorecard does NOT replace SA-026; the tile is a summary.

Trend / comparison view: current period vs prior 2-3 cadence periods for each numeric metric. Highlights significant deltas (e.g., turnaround time spiking, volume dropping).

**Persona scoping verified:**
- Super Admin: any reviewer, any period.
- Reviewer (Dr. Chen): own scorecard only — same six metrics for own data, read-only. Cannot access another reviewer's scorecard (URL manipulation returns 403 / not found).
- Client: blocked entirely (reviewer performance is not client-visible).
- Credentialer: not exposed (Credentialer's job is licensing verification, not performance).

PDF export available for the Super Admin view (and optionally for the reviewer's own view — confirm with PM whether reviewers can download their own scorecard).

**Notes:** NEW REQUIREMENT — confirmed with Ashton (May 2026). Reviewer Scorecard is distinct from Provider Scorecard (SA-096, which scores the doctor under review, not the reviewer). Distinct from Earnings Report (SA-026, which is financial only). Distinct from the per-review answer PDF (SA-013A, which is one chart at a time).

---


## AI Admin Tools — New

### SA-097 — AI chatbot answers natural-language admin queries

**Module:** AI Admin Tools | **Priority:** Low

**Pre-conditions:** Admin chatbot tab/icon visible.

**Steps:**
1. Open chatbot.
2. Ask: "Show me reviewer rankings by speed".
3. Ask: "Assign new batch from Acme Health to Dr. Schrader".

**Test Data:** _(none)_

**Expected Result:** Chatbot returns a sortable ranking. Second prompt either executes the assignment (with confirm) or returns a deep link to the assignment screen pre-filtered.

---


## Delivery — Email vs Portal

### SA-098 — Per-company option to deliver reports by secure email vs portal-only

**Module:** Delivery | **Priority:** Low

**Pre-conditions:** Two companies: A configured for email delivery, B for portal-only.

**Steps:**
1. Generate end-of-quarter package for A.
2. Generate same for B.

**Test Data:** _(none)_

**Expected Result:** A receives a secure email containing the zip. B sees the package only on portal (no email). Configurable per company.

---


## —— NEW REQUIREMENTS (May 2026 — user feedback) ——

> The tests in this final section cover requirements raised in user-feedback meetings (May 2026): peer **specialty multi-select**, **per-specialty pricing**, and **license validity dates**. Most are flagged "NEW REQUIREMENT" — they may not be deployed in production yet. Run them so the dev team has a clean checklist of what is built vs. missing. Mark Status = Fail with Severity = High/Medium and reference the requirement in the Notes column.

## Peers — Specialty Multi-Select (NEW REQUIREMENT)

### SA-099 — Specialties field renders as a MULTI-SELECT control (not single-select)

**Module:** Peers | **Priority:** Critical

**Pre-conditions:** Specialty taxonomy seeded in Settings (see SA-105). At least one peer exists.

**Steps:**
1. Login as Super Admin.
2. Navigate to Peers > select existing peer > Edit.
3. Locate the Specialties input.
4. Inspect the control type (multi-select vs single-select).
5. Try clicking the field — does it allow multiple selections without closing?

**Test Data:** _(none)_

**Expected Result:** Specialties is a MULTI-SELECT control (chips, multi-checkbox, or tag input). Selecting one specialty does NOT close the picker. User can pick more than one before saving.

**Notes:** NEW REQUIREMENT — A peer is allowed to hold multiple specialties (e.g., Family + Pediatrics + Internal Medicine). Single-select would block this.

---

### SA-100 — Add a SINGLE specialty to a peer profile

**Module:** Peers | **Priority:** Critical

**Pre-conditions:** Peer exists with no specialties assigned.

**Steps:**
1. Open peer > Edit.
2. Specialties > select "Family Medicine" only.
3. Save.
4. Reload page and re-open peer.

**Test Data:** Family Medicine

**Expected Result:** Single specialty saves. Displays as one chip / tag in profile and in Peers list. No "second specialty required" error.

**Notes:** NEW REQUIREMENT.

---

### SA-101 — Add MULTIPLE specialties (3+) to a peer profile in one save

**Module:** Peers | **Priority:** Critical

**Pre-conditions:** Peer exists.

**Steps:**
1. Open peer > Edit.
2. Specialties > select **Family Medicine + Pediatrics + Internal Medicine**.
3. Save.
4. Reload page and re-open peer.

**Test Data:** Family Medicine, Pediatrics, Internal Medicine

**Expected Result:** All 3 specialties save together. All 3 display as chips after reload. None lost on save.

**Notes:** NEW REQUIREMENT — confirms multi-select actually persists multiple values, not just the last one clicked.

---

### SA-102 — REMOVE one specialty while keeping the others

**Module:** Peers | **Priority:** High

**Pre-conditions:** Peer has 3 specialties (from SA-101).

**Steps:**
1. Open peer > Edit.
2. Click the X / remove control on the middle specialty (Pediatrics).
3. Save.
4. Reload.

**Expected Result:** Pediatrics removed. Family Medicine and Internal Medicine retained. Order of remaining chips unchanged.

**Notes:** NEW REQUIREMENT.

---

### SA-103 — Peers LIST view DISPLAYS all specialties for each peer

**Module:** Peers | **Priority:** High

**Pre-conditions:** Several peers exist with mixed counts of specialties (some with 1, some with 3+).

**Steps:**
1. Navigate to Peers list.
2. Locate the Specialty column.
3. Inspect rows for peers with 1 specialty, with 3 specialties, with 5+ specialties.
4. Verify nothing is truncated to "first specialty only".

**Expected Result:** Specialty column visible in list. Multi-specialty peers show ALL specialties — either as inline chips, comma-separated, or "Family +2 more" with hover/expand. No silent truncation.

**Notes:** NEW REQUIREMENT.

---

### SA-104 — FILTER Peers list by specialty (multi-specialty peers included)

**Module:** Peers | **Priority:** High

**Pre-conditions:** SA-101 done. At least one peer has Pediatrics + at least one other specialty.

**Steps:**
1. Open Peers list.
2. Apply filter: Specialty = Pediatrics.
3. Verify result set.

**Expected Result:** Result includes BOTH single-specialty pediatricians AND multi-specialty peers who have Pediatrics + others. Peers without Pediatrics are excluded.

**Notes:** NEW REQUIREMENT — a peer with [Family, Pediatrics] must surface for a Pediatrics filter.

---

### SA-105 — Specialty TAXONOMY managed in Settings (add / edit / list)

**Module:** Settings | **Priority:** High

**Pre-conditions:** Logged in as Super Admin.

**Steps:**
1. Settings > Specialties.
2. Verify existing specialties listed.
3. Click "Add Specialty" > enter "Hospitalist" > Save.
4. Open any peer > Edit > Specialties dropdown.

**Test Data:** Hospitalist

**Expected Result:** New specialty visible in admin list immediately. Available in peer profile selector. Editable. Sortable alphabetically.

**Notes:** NEW REQUIREMENT — specialty list must be data-driven, not hard-coded.

---

### SA-106 — Cannot DELETE a specialty that is currently in use

**Module:** Settings | **Priority:** High

**Pre-conditions:** "Family Medicine" is assigned to at least one peer.

**Steps:**
1. Settings > Specialties.
2. Click delete on "Family Medicine".

**Expected Result:** Blocked with message "Cannot delete — assigned to N peers." Force flow: list peers and require reassignment first, OR cascade with a confirmation dialog.

**Notes:** NEW REQUIREMENT — protect referential integrity.

---

## Companies — Per-Specialty Pricing (NEW REQUIREMENT — future capability, not deployed today)

> **Confirmed with Ashton (May 2026):** Today, all client invoices are billed at a **flat rate per company**. The new app should add the **capability** to set per-specialty rates per company. The flat-rate model continues to work; per-specialty rates are an opt-in override. Tests in this section are expected to FAIL until the per-specialty schema and invoice line-item logic ship. The numbers used in test data (Family $100, OB/GYN $110, Dental $90, Cardiology $115) are illustrative — actual rate values come from each contract.

### SA-106B — FLAT rate per company still works (regression — current behavior)

**Module:** Companies | **Priority:** Critical

**Pre-conditions:** Company exists with NO per-specialty rates configured. Company default rate = $100. Reviews exist across multiple specialties.

**Steps:**
1. Open Company > Pricing.
2. Confirm no per-specialty rates set; default rate field shows $100.
3. Generate Invoice.
4. Inspect line items.

**Test Data:** Default rate $100. 10 reviews across Family, OB/GYN, Dental.

**Expected Result:** Invoice bills 10 × $100 = $1,000. Single line item or grouped — but every review uses the flat $100. This is today's behavior and must continue working when per-specialty rates are added (SA-107..SA-115 are an opt-in override on top of this).

**Notes:** REGRESSION — confirmed with Ashton: flat rate remains the default model.

---

### SA-107 — Company contract: ADD a specialty rate (single)

**Module:** Companies | **Priority:** Critical

**Pre-conditions:** Company exists. Specialty taxonomy seeded.

**Steps:**
1. Open Company > Edit > Pricing / Contract section.
2. Click "Add Specialty Rate".
3. Pick specialty = Family Medicine, Rate = $100.
4. Save.
5. Reload and verify.

**Test Data:** Family Medicine = $100

**Expected Result:** New row added to pricing table for the company. Saved value persists after reload. Visible in Company profile pricing area.

**Notes:** NEW REQUIREMENT — replaces single global price-per-review.

---

### SA-108 — Company contract: ADD MULTIPLE specialty rates

**Module:** Companies | **Priority:** Critical

**Pre-conditions:** Company exists.

**Steps:**
1. Open Company > Pricing.
2. Add the following rates one by one (or bulk if UI supports):
   - Family Medicine = $100
   - OB/GYN = $110
   - Dental = $90
   - Cardiology = $115
3. Save after each (or once at the end).
4. Reload.

**Test Data:** 4 specialty rates as above.

**Expected Result:** All 4 rates saved as independent rows. Each editable independently. Pricing table shows all 4. No silent collapse to a single rate.

**Notes:** NEW REQUIREMENT.

---

### SA-109 — Company contract: EDIT an existing specialty rate

**Module:** Companies | **Priority:** High

**Pre-conditions:** SA-108 done.

**Steps:**
1. Open Company > Pricing.
2. Change Family Medicine from $100 to $105.
3. Save.

**Expected Result:** New rate persists. Other specialty rates unchanged. Effective date / change log captured.

**Notes:** NEW REQUIREMENT.

---

### SA-110 — Company contract: REMOVE a specialty rate

**Module:** Companies | **Priority:** Medium

**Pre-conditions:** SA-108 done.

**Steps:**
1. Open Company > Pricing.
2. Delete OB/GYN rate.
3. Save.
4. Confirm via reload.

**Expected Result:** Row removed. Going forward, OB/GYN reviews bill at the company default rate (not at the previously set $110).

**Notes:** NEW REQUIREMENT.

---

### SA-111 — DEFAULT rate fallback for specialties without a custom rate

**Module:** Companies | **Priority:** High

**Pre-conditions:** Company has custom rates ONLY for Family Medicine ($100) and Dental ($90). Company default rate = $95. Reviews exist across Family, Dental, Cardiology.

**Steps:**
1. Generate invoice for the company.
2. Inspect line item for Cardiology reviews.

**Expected Result:** Family bills at $100, Dental at $90, Cardiology at $95 (default fallback). Default rate clearly labeled in invoice.

**Notes:** NEW REQUIREMENT — confirm fallback behavior with PM (could also error if no default).

---

### SA-112 — Negative / zero rate REJECTED

**Module:** Companies | **Priority:** Medium

**Pre-conditions:** Company exists.

**Steps:**
1. Try to save Family Medicine rate = $0.
2. Try to save Family Medicine rate = -$10.
3. Try non-numeric input.

**Expected Result:** All three rejected with validation message. Save blocked. Existing rates not corrupted.

**Notes:** NEW REQUIREMENT — input validation.

---

### SA-113 — Invoice generates PER-SPECIALTY LINE ITEMS

**Module:** Companies | **Priority:** Critical

**Pre-conditions:** SA-108 done. Reviews completed for the company:
- 5 Family Medicine reviews
- 2 OB/GYN reviews
- 3 Dental reviews
- 1 Cardiology review

**Steps:**
1. Companies > select company > Generate Invoice.
2. Inspect line items.

**Expected Result:** Invoice shows 4 line items, one per specialty:
- Family Medicine: 5 × $100 = $500
- OB/GYN: 2 × $110 = $220
- Dental: 3 × $90 = $270
- Cardiology: 1 × $115 = $115

Subtotal: $1,105. Each line shows count, rate, and subtotal columns.

**Notes:** NEW REQUIREMENT — invoice math drives directly off SA-108.

---

### SA-114 — Invoice TOTAL matches manual calculation to the cent

**Module:** Companies | **Priority:** Critical

**Pre-conditions:** SA-113 generated.

**Steps:**
1. Manually compute: 500 + 220 + 270 + 115 = $1,105.
2. Compare to invoice subtotal and grand total.
3. Verify any taxes / fees are applied AFTER specialty subtotal.

**Expected Result:** Subtotal = $1,105 exactly. Grand total includes any documented taxes / discounts. No rounding errors.

**Notes:** NEW REQUIREMENT.

---

### SA-115 — Rate changes DO NOT retroactively alter previously generated invoices

**Module:** Companies | **Priority:** High

**Pre-conditions:** Invoice generated for Q4 2025 with Family Medicine = $100. Then in Q1 2026, rate changed to $105.

**Steps:**
1. Re-open the Q4 2025 invoice.
2. Inspect Family Medicine line item rate.

**Expected Result:** Q4 2025 invoice still shows $100. Rate is locked at the value used at generation time. Q1 2026 invoice will reflect new $105.

**Notes:** NEW REQUIREMENT — historical integrity.

---

## Peers — License Validity Date (NEW — was not previously tested)

### SA-116 — Peer profile captures License NUMBER and STATE

**Module:** Peers | **Priority:** Critical

**Pre-conditions:** Adding new peer or editing existing peer.

**Steps:**
1. Peers > Add (or Edit existing).
2. Fill License Number = "MD-12345-TX".
3. Fill License State / Issuing Authority = "Texas".
4. Save.
5. Reload and verify.

**Test Data:** License Number: MD-12345-TX, State: Texas

**Expected Result:** Both fields persist. Display in profile and in Peers list (or accessible via drill-in).

**Notes:** Cleanup of SA-024 — that test only said "change License Number and License State" without specifying validation. This baseline test confirms storage.

---

### SA-117 — Peer profile captures License ISSUE DATE and EXPIRY DATE

**Module:** Peers | **Priority:** Critical

**Pre-conditions:** Editing peer.

**Steps:**
1. Peers > Edit.
2. Fill License Issue Date = 2024-01-15.
3. Fill License Expiry Date = 2027-01-15.
4. Save.
5. Reload.

**Test Data:** Issue: 2024-01-15, Expiry: 2027-01-15

**Expected Result:** Both date fields present in UI. Both persist after save. Expiry date is FORMATTED clearly (MM/DD/YYYY) and visible on the Peers list (column or hover).

**Notes:** GAP — these fields were not previously tested at all.

---

### SA-118 — License expiry date VALIDATION (must be after issue date)

**Module:** Peers | **Priority:** High

**Pre-conditions:** Editing peer.

**Steps:**
1. Set License Issue Date = 2026-01-15.
2. Set License Expiry Date = 2025-01-15 (BEFORE issue).
3. Click Save.

**Expected Result:** Validation error: "Expiry date must be after issue date." Save blocked. No corrupted record.

**Notes:** NEW.

---

### SA-119 — License date INPUT validation (no random strings)

**Module:** Peers | **Priority:** Medium

**Pre-conditions:** Editing peer.

**Steps:**
1. Try entering "tomorrow", "n/a", "13/45/2026" in License Expiry Date.
2. Save.

**Expected Result:** Invalid input rejected by the date picker / form validator. Field highlighted in red.

**Notes:** NEW.

---

### SA-120 — License DOCUMENT upload (PDF / image of license)

**Module:** Peers | **Priority:** High

**Pre-conditions:** Peer profile open in edit mode.

**Steps:**
1. Locate License Document upload control.
2. Upload a PDF (e.g., license-scan.pdf) or image (license.png).
3. Save.
4. Re-open peer profile.
5. Click the document link.

**Test Data:** Sample PDF / image file ≤ 5 MB.

**Expected Result:** File attached to peer record. Viewable / downloadable. File name visible. Multiple uploads supported (or new upload replaces old, depending on design — confirm with PM).

**Notes:** NEW.

---

### SA-121 — EXPIRED license shows warning badge in Peers list

**Module:** Peers | **Priority:** Critical

**Pre-conditions:** At least one peer has License Expiry Date in the past (e.g., 2024-12-31).

**Steps:**
1. Open Peers list.
2. Locate the expired peer.
3. Inspect visual indicator.
4. Apply "License Expired" filter if available.

**Expected Result:** Expired peer flagged visually (red badge / "EXPIRED" tag / red border). Filter for expired peers works. Sortable by expiry.

**Notes:** NEW.

---

### SA-122 — EXPIRED license REMOVES peer from assignment process entirely

**Module:** Peers | **Priority:** Critical

**Pre-conditions:** Peer "Dr. X" has expired license. Cases are awaiting assignment.

**Steps:**
1. Try to assign a new case to Dr. X via manual assignment (peer dropdown / search).
2. Try to bulk-assign batches with Dr. X as recipient.
3. Trigger auto-assignment (round-robin, max-load, etc.) on a queue where Dr. X would otherwise have qualified by specialty + capacity.
4. Open the peer-selection UI on any assignment screen; search for Dr. X by name.
5. Inspect existing in-progress reviews already assigned to Dr. X BEFORE expiry.

**Expected Result:**
- Dr. X is **NOT present in the peer-selection dropdown / search results** on any assignment screen — silently filtered out.
- Manual assignment by direct ID (if attempted via URL / API) returns a clear error: "Cannot assign — license expired on YYYY-MM-DD."
- Auto-assignment skips Dr. X entirely and routes to the next eligible peer.
- Existing in-progress reviews assigned BEFORE expiry are **automatically reassigned** to the next available eligible peer with admin notified — see SA-123 for the full reassignment + notification flow.

**Notes:** Confirmed with Ashton (May 2026): once expired, peer should NOT show up in assignment process at all (not just blocked at submit). In-progress cases auto-reassigned to next available reviewer with SA notification — covered in SA-123.

---

### SA-123 — License expiry WARNING fires at 14 / 7 / 3 / 1 day thresholds + post-expiry; in-progress cases auto-reassigned

**Module:** Peers | **Priority:** Critical

**Pre-conditions:** Five test peers with expiry in 13, 6, 2, 0 days, and 1 day past expiry. SMTP working for Super Admin and Credentialer. The about-to-expire peer "Dr. X" has 4 in-progress cases assigned at the time of expiry. At least 2 eligible alternative peers (matching specialty, license valid, capacity available) exist for those cases.

**Steps:**
1. Open Peers list / dashboard.
2. Inspect each peer's status badge for the correct "Expires in N days" / "EXPIRED" indicator.
3. Check Super Admin notification panel / email inbox at each threshold (14, 7, 3, 1).
4. Check Credentialer dashboard / inbox at each threshold.
5. Wait for / simulate Dr. X's expiry crossing midnight on day-zero.
6. Inspect Dr. X's state — should auto-transition to **License Expired** (per SA-031G).
7. Inspect Dr. X's previously-assigned cases:
   - Where do they go?
   - Who is the new assignee?
   - Is there an audit trail of the auto-reassignment?
8. Inspect Super Admin's notifications:
   - Was an admin alert sent confirming the auto-reassignment + listing affected cases?
9. Sub-scenario: case where NO eligible alternative peer exists (all matching peers also expired or at capacity) — verify behavior.

**Test Data:** 5 peers + Dr. X with 4 in-progress cases.

**Expected Result:**
- Notifications fire at exactly four pre-expiry thresholds (14, 7, 3, 1 days) AND once on the day the license expires. Each peer gets its own row in the email — no spam: one email per (peer × threshold), never duplicated. Status badge updates accordingly. Both SA and Credentialer receive notifications.
- On expiry, Dr. X's state auto-transitions to **License Expired** (per SA-031G).
- Dr. X's 4 in-progress cases are **automatically reassigned** to the next available eligible peer:
  - Capacity rule applied (per SA-074): only peers with `current load < Max` and matching specialty are candidates.
  - Cases distribute across multiple peers if a single replacement doesn't have capacity for all 4 (per SA-067I split rule).
  - Each reassignment is recorded in the case's audit history with reason = "Original peer license expired YYYY-MM-DD."
- **Super Admin alert email** fires when auto-reassignment runs:
  - Subject: "License expiry: Dr. X — N cases auto-reassigned"
  - Body lists each case, its original peer (Dr. X), its new peer, and a "Review reassignments" deep link.
  - Sent to SA notification panel + email.
- Sub-scenario (no eligible alternative): cases stay in their current state but are flagged "Needs Reassignment" and surface in the SA Assignments page filter; SA notification email indicates manual intervention required.

**Notes:** Cadence simplified May 2026 to **14 / 7 / 3 / 1 + post-expiry** (replaces earlier 60/30/15/7/3/1 plan — Ashton's call: 60-day lead is too noisy). Auto-reassignment behavior also confirmed: in-progress cases of an expired peer go to the next available reviewer with admin notified. Resolves the open question previously logged in FutureRequirements.md about in-progress-case handling on license expiry. Pairs with SA-031G (auto state transition), SA-074 (capacity rule), SA-067I (batch-split rule applied to reassignment).

---

### SA-124 — _SUPERSEDED by CR-017 + SA-031H_

**Module:** Peers | **Priority:** —

**Pre-conditions:** —

**Steps:** Originally tested SA-side license renewal triggering reactivation of an expired peer. Superseded May 2026 — renewal action lives in the Credentialer flow (CR-017), and the state-transition semantics live in SA-031H. CR-017 now also covers the Active-peer early-renewal case (no state change).

**Test Data:** _(none)_

**Expected Result:** _Test superseded — do not run. Use CR-017 for renewal action and SA-031H for state-transition semantics._

**Notes:** SUPERSEDED — kept as a placeholder so test IDs don't shift.

---

### SA-125 — License data SYNCS to Credentialer view (and vice versa)

**Module:** Peers | **Priority:** High

**Pre-conditions:** Super Admin and Credentialer accounts both available.

**Steps:**
1. (SA) Open Dr. X > update License Expiry to 2028-01-15. Save.
2. (Credentialer) Login > open Dr. X credentialing record.
3. Verify Expiry shows 2028-01-15.
4. (Credentialer) Update Expiry to 2028-06-15. Save.
5. (SA) Reload Dr. X profile.
6. Verify Expiry shows 2028-06-15.

**Expected Result:** License values are SHARED, not duplicated. Both personas see the same source of truth. Audit log captures who changed what and when.

**Notes:** NEW — confirms there isn't a hidden duplicate "license" object only one persona can edit.

---

### SA-126 — License history / audit log

**Module:** Peers | **Priority:** Medium

**Pre-conditions:** Peer has been edited multiple times (initial license + renewal + correction).

**Steps:**
1. Open peer > License section.
2. Click "History" or audit-log link.
3. Inspect entries.

**Expected Result:** Each license-related change recorded with timestamp, actor (user), old value, new value. Cannot be edited / deleted by any persona. Critical for HIPAA / accreditation audits.

**Notes:** NEW — confirm with PM whether this is in scope.

---

## (Items previously labeled SA-099–SA-110 above were renumbered into the comprehensive sections above. Forms scoring, AI trend search, and Delivery tests below.)

## Forms — Scoring Configuration (was NR-001 / NR-002 / NR-003)

> **Scoring computation rule (confirmed May 2026):** Question scoring is **default-based**, not weight-based:
>
> - **Reviewer selects the question's configured DEFAULT answer** → that question scores **100%** (1 / 1).
> - **Reviewer selects NA** → that question is **excluded** from both numerator and denominator (does not count for or against the score).
> - **Reviewer selects ANY OTHER non-default, non-NA answer** → that question scores **0%** (0 / 1).
>
> Per-question score is averaged across all scored questions to produce the review-level score (the "Total Measures Met %" shown on Per-Provider Review Answers, Provider Highlights, Specialty Highlights, and Question Analytics).
>
> Examples:
> - Yes/No/NA form, default answer "Yes": Yes → 100, No → 0, NA → excluded.
> - A/B/C/NA form, default answer "A": A → 100, B → 0, C → 0, NA → excluded.
> - 12 questions: reviewer answers 10 default + 1 non-default + 1 NA → score = 10 / (10+1) = **90.91%** (NA dropped from denominator).
>
> This produces the percentages seen in the example reports (e.g., 98.89% = 89 Yes / (89+1) with 0 NA on a Yes-default question; 55.56% = 50 Yes / (50+40) with 0 NA on a Yes-default question).

### SA-127 — Admin can CONFIGURE scoring rule per form (umbrella setting)

**Module:** Forms | **Priority:** Critical

**Pre-conditions:** Logged in as Super Admin. Forms section accessible.

**Steps:**
1. Forms > Create New Form (or Edit existing).
2. Locate "Scoring System" selector at form level.
3. Inspect available options.
4. Pick one (e.g., A/B/C/NA) and save.
5. Re-open form to confirm persistence.

**Expected Result:** Scoring System selector exists with options: Yes/No/NA (default-based %), A/B/C/NA (default-based %, multiple options), Pass/Fail (binary outcome). Selection persists. Question option-set adapts to chosen scoring system.

**Notes:** NEW REQUIREMENT — parent setting. Per SA-127A, scoring is default-based across all option sets.

---

### SA-127A — Default-based scoring math: per-question score (Yes/No/NA case)

**Module:** Forms / Reports | **Priority:** Critical

**Pre-conditions:** Form configured with Yes/No/NA scoring. One question, "Is BP documented?", default answer = "Yes" (per SA-044).

**Steps:**
1. Create 3 reviews:
   - Review 1: reviewer answers "Yes".
   - Review 2: reviewer answers "No".
   - Review 3: reviewer answers "NA".
2. Open each review's Per-Provider Review Answers PDF (per SA-013A).
3. Inspect the per-question score AND the review-level score.
4. Cross-check the company-level Question Analytics PDF (per SA-013B).

**Test Data:** _(none — the 3 reviews above)_

**Expected Result:**
- Review 1 (default selected): question scores 100%. Single-question form → review-level score = 100%.
- Review 2 (non-default, non-NA): question scores 0%. Single-question form → review-level score = 0%.
- Review 3 (NA): question is **excluded**. Single-question form has nothing scored — review-level score is N/A or "no measures applicable" (confirm display behavior with PM).
- Question Analytics PDF aggregates: 1 Yes, 1 No, 1 NA → "Yes %" = 1 / (1 + 1) = 50% (NA dropped). Yes count / No count / NA count all displayed per the example PDF format.

**Notes:** Confirmed with Ashton (May 2026). This rule produces the percentages on the example Q4 2025 reports.

---

### SA-127B — Default-based scoring math: review-level score (mixed default / non-default / NA)

**Module:** Forms / Reports | **Priority:** Critical

**Pre-conditions:** Form with 12 questions, all using Yes/No/NA scoring, all with default = "Yes". A reviewer completes the review with: 10 Yes + 1 No + 1 NA.

**Steps:**
1. Reviewer submits.
2. Open the Per-Provider Review Answers PDF.
3. Locate the "Total Measures Met %".
4. Manually compute: 10 / (10 + 1) = 90.909...% → rounded to display per system rule (90.91% or 91%, confirm with PM).
5. Open Question Analytics for the same form / period — find this reviewer's contribution to per-question counts.
6. Open Provider Highlights — find the reviewer's provider's overall score for this period.

**Test Data:** _(see pre-conditions)_

**Expected Result:**
- "Total Measures Met %" on the review = 10 / (10 + 1) = 90.91%. NA dropped from denominator entirely (denominator = 11, not 12).
- Question Analytics totals reflect: 10 Yes, 1 No, 1 NA across the 12 questions for this reviewer.
- Provider Highlights aggregates this review with the provider's other reviews — average across all reviews for the provider in the cadence period.

**Notes:** Critical math test. Confirms 12-question example: NA exclusion produces a denominator of 11, not 12.

---

### SA-127C — Default-based scoring math: Question Analytics aggregation matches example report

**Module:** Reports | **Priority:** Critical

**Pre-conditions:** Reference data from `Family_Question_Analytics_Q4_2025.pdf`. Match a question's pattern: e.g., "Is the history of present illness clear and logical?" — 89 Yes / 1 No / 0 NA → 98.89%.

**Steps:**
1. Seed test data matching the example: 90 reviews, 89 default ("Yes") + 1 non-default ("No") + 0 NA on the test question.
2. Generate Question Analytics report.
3. Inspect the question's percentage.
4. Repeat for "Is the problem list up to date..." pattern: 50 Yes / 40 No / 0 NA → 55.56% expected.
5. Repeat for an NA-heavy question: e.g., "If annual exam, is the patient up to date on cancer screening?" → 10 Yes / 4 No / 76 NA → 71.43% (10 / (10+4) = 71.43%, NA dropped).

**Test Data:** Three patterns: 89/1/0, 50/40/0, 10/4/76.

**Expected Result:**
- Pattern 1: 89 / (89 + 1) = 98.89% ✓
- Pattern 2: 50 / (50 + 40) = 55.56% ✓
- Pattern 3: 10 / (10 + 4) = 71.43% ✓ (76 NA cases excluded from denominator)
- All three percentages match exactly to 2 decimal places against the reference example.

**Notes:** Regression test against the actual Q4 2025 example data. If percentages drift, the scoring rule has been broken.

---

### SA-128 — Form supports A/B/C/NA scoring option set (default-based scoring)

**Module:** Forms | **Priority:** Critical

**Pre-conditions:** SA-127 working. Form created with Scoring System = A/B/C/NA.

**Steps:**
1. Add multiple-choice questions to the form.
2. Verify each question's answer options auto-populate as A / B / C / NA.
3. For each question, configure the **default answer** (e.g., default = A).
4. Publish the form.
5. Have a peer complete a review using this form. Test with a mix of default A, non-default B, non-default C, and NA answers.
6. Verify score computation matches the default-based rule (per SA-127A).

**Test Data:** Form with 5 questions, all default = A. Reviewer answers: A, A, B, C, NA.

**Expected Result:**
- Per the default rule: A scores 100, B scores 0, C scores 0, NA excluded.
- Review-level score = 2 / (2 + 1 + 1) = 2 / 4 = 50.00%. NA case dropped from denominator (denominator = 4, not 5).
- Question Analytics for an A/B/C/NA question shows counts per option (A count, B count, C count, NA count) and the "default answer hit rate" % computed as defaultCount / (defaultCount + non-default-non-NA-count).

**Notes:** Updated May 2026 — earlier weighted-scoring wording (A=3, B=2, C=1) replaced with default-based scoring per Ashton's confirmation. Same scoring engine across Yes/No/NA and A/B/C/NA option sets. Pairs with SA-127A/B/C.

---

### SA-129 — Form supports Pass/Fail scoring system

**Module:** Forms | **Priority:** Critical

**Pre-conditions:** SA-127 working. Form created with Scoring System = Pass/Fail.

**Steps:**
1. Configure form with Pass/Fail scoring.
2. Set the threshold rule (e.g., "Fail if any critical-question = No", or "Pass if ≥80% Yes").
3. Have peer complete review.
4. Inspect result on review summary, Reports, and exported certificate.

**Expected Result:** Review outcome shows as "Pass" or "Fail" (no percentage). Threshold logic works correctly. Reports aggregate as % Passed instead of average score. Quality Certificate reflects pass/fail wording.

**Notes:** NEW REQUIREMENT — use case: credentialing/compliance reviews where binary outcome is required. Pass/Fail is distinct from default-based scoring (SA-127A) — it produces a binary outcome, not a percentage.

---

## Reports — AI-Powered Trend Search (was NR-012)

### SA-130 — AI-powered trend / risk search across past reviews

**Module:** Reports | **Priority:** High

**Pre-conditions:** Multiple quarters of historical reviews exist for at least 1 company.

**Steps:**
1. Reports > Trend / Risk Analytics.
2. Enter a natural-language query (e.g., "Which providers show declining scores in diabetes management over the past 4 quarters?").
3. Inspect AI-generated answer.
4. Try follow-up: "Show me the underlying reviews."

**Expected Result:** AI returns coherent answer with cited reviews / providers / dates. Drill-through to source reviews works. No PHI leaked into AI prompt logs.

**Notes:** NEW REQUIREMENT — Ashton's "AI search across past reviews" vision.

---

## Delivery — Download All & Secure Email (was NR-010, expanded)

### SA-131 — Download All — bundle every client deliverable for the period as ZIP

**Module:** Delivery | **Priority:** High

**Pre-conditions:** Reports generated for a company for a quarter (Provider Highlights, Specialty Highlights, Question Analytics × N specialties, Quality Certificate, Invoice).

**Steps:**
1. Reports > select company + quarter.
2. Click "Download All".
3. Inspect downloaded ZIP.

**Expected Result:** Single ZIP containing every PDF deliverable for that company / quarter. Filenames are descriptive (e.g., Provider_Highlights_Q4_2025.pdf). No missing files. PHI files excluded unless explicitly authorized.

**Notes:** NEW REQUIREMENT.

---

### SA-132 — Send reports via SECURE EMAIL to client contact

**Module:** Delivery | **Priority:** High

**Pre-conditions:** Reports generated. Client primary contact email on file.

**Steps:**
1. Reports > select company > "Send to Client" button.
2. Confirm recipient (auto-populated client contact).
3. Optionally add cc / message.
4. Send.
5. Verify delivery (sent items log, recipient inbox, audit trail).

**Expected Result:** Encrypted/secure email delivered (TLS+ encrypted attachments, or secure portal link with expiring auth token). Audit log records timestamp + recipient + report list. Client contact receives and can open with no password issues.

**Notes:** NEW REQUIREMENT — pairs with SA-098 (per-company toggle email vs portal).

---
