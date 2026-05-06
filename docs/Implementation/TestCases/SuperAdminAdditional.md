# Super Admin — Additional Test Cases

> These test cases cover features added during Phase 9A (Testing Fixes & Enhancements). They supplement the original SuperAdmin.md test cases.

---


## Review Cadence — Auto-Calculation

### SAA-001 — next_cycle_due auto-calculated on cadence config save

**Module:** Companies — Review Cadence | **Priority:** High

**Pre-conditions:** Company exists with Review Cadence not yet configured.

**Steps:**
1. Open Company > Edit > Review Cadence section.
2. Set Frequency = Quarterly, Fiscal Year Start = January.
3. Click Save Cadence.
4. Check the database or dashboard "Upcoming Cycles" for this company.

**Expected Result:** `next_cycle_due` is automatically set to the start date of the next cadence period. For Quarterly FY-Jan on May 5, 2026: current period = Q2 (Apr–Jun), so `next_cycle_due = 2026-07-01` (Q3 start).

---

### SAA-002 — next_cycle_due recalculates on cadence CHANGE

**Module:** Companies — Review Cadence | **Priority:** High

**Pre-conditions:** Company has Quarterly FY-Jan cadence configured.

**Steps:**
1. Change cadence from Quarterly to Monthly.
2. Save.
3. Check `next_cycle_due`.

**Expected Result:** `next_cycle_due` immediately recalculates based on the new Monthly cadence. Should be the 1st of the next month, not the old quarterly boundary.

---

### SAA-003 — Daily cron updates next_cycle_due for all active companies

**Module:** Companies — Review Cadence | **Priority:** High

**Pre-conditions:** Multiple active companies with different cadence configs. `next_cycle_due` cleared.

**Steps:**
1. Trigger `/api/cron/update-cycle-dates` (or wait for daily cron at 1am UTC).
2. Check all active companies.

**Expected Result:** Every active company has `next_cycle_due` populated with the correct next period start date. Cadence tags created for current AND next period (no duplicates).

---

### SAA-004 — Upcoming Cycles widget shows cadence tag label

**Module:** Dashboard | **Priority:** Medium

**Pre-conditions:** Companies with `next_cycle_due` within the next 30 days.

**Steps:**
1. Open Admin Dashboard.
2. Locate "Upcoming Cycles (next 30 days)" section.

**Expected Result:** Each company shows: name (clickable), cadence period label badge (e.g., "Q3 2026" in cobalt), due date, days-remaining badge. Labels are properly cased (uppercase Q, title case months).

---

### SAA-005 — Period sequence only shows periods with actual data

**Module:** Companies — Review Cadence | **Priority:** Medium

**Pre-conditions:** Company has cadence configured. Some periods have batches/reviews, others don't.

**Steps:**
1. Open company detail page.
2. Scroll to Review Cadence section.
3. Inspect the period sequence grid.

**Expected Result:** Only periods that have actual batches or reviews are shown. Empty calculated periods do NOT appear. If no batches exist for any period, the section is hidden.

---


## Tags — Company-Level

### SAA-006 — Create company-level tag from Tags page

**Module:** Tags | **Priority:** High

**Pre-conditions:** Logged in as Super Admin. At least 1 active company exists.

**Steps:**
1. Go to Tags page > Cadence Tags tab.
2. In "Create Company Tag" form, select a company from dropdown.
3. Enter tag name (e.g., "Priority Audit").
4. Select color and optional description.
5. Click Create Company Tag.

**Expected Result:** Tag created with scope = cadence, associated to the selected company. Appears in the cadence tags list under that company group.

---

### SAA-007 — Duplicate tag rejected at company level

**Module:** Tags | **Priority:** High

**Pre-conditions:** Company tag "Priority Audit" already exists for Company A.

**Steps:**
1. Try to create another tag named "Priority Audit" for Company A.

**Expected Result:** Rejected with error: "Tag 'Priority Audit' already exists for this company." Tag NOT created.

---

### SAA-008 — Duplicate tag rejected if global tag with same name exists

**Module:** Tags | **Priority:** High

**Pre-conditions:** Global tag "high-acuity" exists.

**Steps:**
1. Try to create a company-level tag named "high-acuity" for any company.

**Expected Result:** Rejected with error: "Tag 'high-acuity' already exists as a global tag." Tag NOT created.

---

### SAA-009 — Company filter on cadence tags tab

**Module:** Tags | **Priority:** Medium

**Pre-conditions:** Multiple companies have cadence tags.

**Steps:**
1. Go to Tags page > Cadence Tags tab.
2. Use the company dropdown filter to select a specific company.
3. Observe the tag list.

**Expected Result:** Only tags for the selected company are shown. Selecting "All companies" shows all cadence tags grouped by company.

---

### SAA-010 — Company name is clickable link to company edit page

**Module:** Tags | **Priority:** Low

**Pre-conditions:** Cadence tags exist for at least one company.

**Steps:**
1. Go to Tags page > Cadence Tags tab.
2. Click on a company name in the group header.

**Expected Result:** Navigates to `/companies/{id}` — the company detail/edit page.

---


## Peer State Machine

### SAA-011 — Suspend peer blocked when peer has active assignments

**Module:** Peers | **Priority:** High

**Pre-conditions:** Peer has at least 1 case with status "assigned" or "in_progress".

**Steps:**
1. Open peer detail page.
2. Click Suspend button.
3. Enter reason and confirm.

**Expected Result:** Blocked with error: "Cannot suspend peer with active assignments. Reassign their cases first." Peer state unchanged.

---

### SAA-012 — Archive peer blocked when peer has active assignments

**Module:** Peers | **Priority:** High

**Pre-conditions:** Same as SAA-011.

**Steps:**
1. Click Archive button on peer detail.
2. Enter reason and confirm.

**Expected Result:** Blocked with same error. Peer state unchanged.

---

### SAA-013 — State history auto-refreshes after transition

**Module:** Peers | **Priority:** Medium

**Pre-conditions:** Peer in Active state.

**Steps:**
1. Click Suspend, enter reason, confirm.
2. Without refreshing the page, scroll to State History section.

**Expected Result:** State History shows the new transition entry immediately without requiring a page refresh.

---


## Forms

### SAA-014 — Forms list shows response count and average duration

**Module:** Forms | **Priority:** Medium

**Pre-conditions:** Forms exist with completed reviews.

**Steps:**
1. Go to Forms page.
2. Inspect the Responses and Avg Duration columns.

**Expected Result:** Each form shows the count of completed reviews using that form and the average time spent per review (in minutes). Forms with no reviews show 0 and "—".

---

### SAA-015 — Form field reorder with up/down buttons

**Module:** Forms | **Priority:** Medium

**Pre-conditions:** Form builder open with 3+ fields.

**Steps:**
1. Click the down arrow on field 1.
2. Verify field 1 moves to position 2.
3. Click the up arrow on the now-position-2 field.
4. Verify it moves back to position 1.
5. Save the form.

**Expected Result:** Field order persists after save. Up arrow disabled on first field, down arrow disabled on last field.

---


## Assignments

### SAA-016 — Reject AI suggestion resets case to unassigned

**Module:** Assignments | **Priority:** High

**Pre-conditions:** AI has suggested an assignment (status = "pending_approval").

**Steps:**
1. Call POST `/api/assign/approve` with `{ case_id: "...", reject: true }`.

**Expected Result:** Case status flips to "unassigned". Peer ID cleared. Audit log records the rejection.

---

### SAA-017 — Cannot reassign a completed review

**Module:** Assignments | **Priority:** High

**Pre-conditions:** Case with status = "completed".

**Steps:**
1. Try to PATCH `/api/cases/{id}` with `{ action: "reassign", peer_id: "..." }`.

**Expected Result:** Rejected with 409: "Cannot reassign a completed review." Case unchanged.

---


## Client Files

### SAA-018 — Client files page shows uploaded batches

**Module:** Client Portal — Files | **Priority:** High

**Pre-conditions:** Client has uploaded batches.

**Steps:**
1. Login as Client.
2. Navigate to My Files.

**Expected Result:** Table shows batch name, specialty, upload date, file count, completed count, status. Expired batches (>30 days) show "Expired" badge.

---

### SAA-019 — Client drill-in to batch files

**Module:** Client Portal — Files | **Priority:** Medium

**Pre-conditions:** Batch exists with files.

**Steps:**
1. Click a batch row in My Files.

**Expected Result:** Shows individual files: file name, provider, specialty, status, upload date, download link.

---


## HIPAA

### SAA-020 — localStorage draft does NOT contain PHI

**Module:** Peer Review | **Priority:** Critical

**Pre-conditions:** Peer is conducting a review.

**Steps:**
1. Open a case review as Peer.
2. Fill in MRN, license number, some Yes/No answers.
3. Open browser DevTools > Application > localStorage.
4. Find the `peerspectiv.draft.{caseId}` key.
5. Inspect the stored JSON.

**Expected Result:** JSON contains only `state` (Yes/No/NA answers) and `peerComments`. Does NOT contain `mrnNumber`, `licenseNumber`, or `licenseState`. These fields are PHI/PII and must not be stored client-side.

---

### SAA-021 — MRN field strips HTML tags (XSS prevention)

**Module:** Peer Review | **Priority:** High

**Pre-conditions:** Peer is on a review form.

**Steps:**
1. In the MRN field, type: `<script>alert(1)</script>`
2. Inspect the stored value.

**Expected Result:** HTML tags are stripped. The field value shows `alert(1)` with no HTML. No script execution.

---


## Company Status Flow

### SAA-022 — New company created with Draft status

**Module:** Companies | **Priority:** High

**Pre-conditions:** —

**Steps:**
1. Click + Add Company.
2. Fill in name, contact, email, per-review rate.
3. Save.

**Expected Result:** Company created with status = **Draft**. No client account generated. Company visible in list when "Draft" filter is selected.

---

### SAA-023 — Companies list defaults to Active filter

**Module:** Companies | **Priority:** Medium

**Pre-conditions:** Companies exist with various statuses (draft, active, archived).

**Steps:**
1. Navigate to Companies page.
2. Observe the status filter dropdown.

**Expected Result:** Default filter is "Active" — only active companies shown. Dropdown includes: Active, Draft, Contract Sent, Contract Signed, Archived, All statuses.

---

### SAA-024 — Company status flow: Draft → Contract Sent → Contract Signed → Active → Archived

**Module:** Companies | **Priority:** High

**Pre-conditions:** Company in Draft status.

**Steps:**
1. Send contract via DocuSign → status = Contract Sent.
2. Contract signed webhook → status = Contract Signed.
3. Admin activates portal access → status = Active. Client account created + welcome email sent.
4. Admin archives company → status = Archived (blocked if active cases exist per SA-042).

**Expected Result:** Each status transition is valid. Company cannot skip statuses. Active status is only reached via activation (not direct edit).

---

### SAA-025 — Status badges display correctly for all statuses

**Module:** Companies | **Priority:** Low

**Pre-conditions:** Companies with various statuses.

**Steps:**
1. View companies list with "All statuses" filter.
2. Inspect status badges.

**Expected Result:** Draft = outline badge. Active = green badge. Contract Sent / Contract Signed / Archived = secondary badge. Underscores replaced with spaces in display (e.g., "contract sent" not "contract_sent").

---

### SAA-026 — Provider import CSV template downloadable

**Module:** Companies — Providers | **Priority:** Medium

**Pre-conditions:** On company detail page.

**Steps:**
1. Click "Import providers".
2. Click "Download CSV template" link.

**Expected Result:** Downloads `provider_import_template.csv` with headers: first_name, last_name, specialty, npi, email. Includes 2 sample rows. PDF guidance note shown below.

---

---

### SAA-021 — MRN field strips HTML tags (XSS prevention)

**Module:** Peer Review | **Priority:** High

**Pre-conditions:** Peer is on a review form.

**Steps:**
1. In the MRN field, type: `<script>alert(1)</script>`
2. Inspect the stored value.

**Expected Result:** HTML tags are stripped. The field value shows `alert(1)` with no HTML. No script execution.

---
