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


## Company Status Guards

> Operations are gated by company status. Setup allowed during Draft/Contract phases; operational activities only when Active.

### SAA-027 — Draft company allows adding providers and forms

**Module:** Companies | **Priority:** High

**Pre-conditions:** Company in Draft status.

**Steps:**
1. Open company detail page.
2. Add a provider.
3. Create a form for this company.

**Expected Result:** Both succeed. Providers and forms can be set up before activation.

---

### SAA-028 — Draft company blocks batch upload

**Module:** Companies | **Priority:** Critical

**Pre-conditions:** Company in Draft status.

**Steps:**
1. Try to upload a batch of charts for this company.

**Expected Result:** Blocked with error: "Company must be Active to upload batches." Batch NOT created.

---

### SAA-029 — Draft company blocks case assignment

**Module:** Companies | **Priority:** Critical

**Pre-conditions:** Company in Draft status.

**Steps:**
1. Try to assign cases or trigger AI suggestions for this company.

**Expected Result:** Blocked. Cases cannot be assigned for non-Active companies.

---

### SAA-030 — Draft company blocks invoice generation

**Module:** Companies | **Priority:** Critical

**Pre-conditions:** Company in Draft status.

**Steps:**
1. Try to generate an invoice for this company.

**Expected Result:** Blocked with error: "Company must be Active to generate invoices."

---

### SAA-031 — Draft company blocks report generation

**Module:** Companies | **Priority:** Critical

**Pre-conditions:** Company in Draft status.

**Steps:**
1. Try to generate any of the 5 report types for this company.

**Expected Result:** Blocked with error: "Company must be Active to generate reports."

---

### SAA-032 — Archived company blocks all operations

**Module:** Companies | **Priority:** High

**Pre-conditions:** Company in Archived status.

**Steps:**
1. Try to edit company details.
2. Try to add providers.
3. Try to upload batches.

**Expected Result:** All operations blocked. Archived companies are read-only.

---

### SAA-033 — Active company allows all operations

**Module:** Companies | **Priority:** High

**Pre-conditions:** Company in Active status.

**Steps:**
1. Add a provider.
2. Create a form.
3. Upload a batch.
4. Generate an invoice.
5. Generate a report.

**Expected Result:** All operations succeed for Active companies.

---


## Company Detail Page — Visible Fields

### SAA-034 — Company detail page shows Company Details card

**Module:** Companies | **Priority:** High

**Pre-conditions:** Company exists with address, city, state, annual review count, and notes populated.

**Steps:**
1. Navigate to /companies/{id}.
2. Locate the "Company Details" card below the header.

**Expected Result:** Card displays: Address, City/State, Annual Review Count, Itemize Invoices (Yes/No), Report Delivery preference, Report Bundle Delivery preference, and Notes (if present). Per-review rate is NOT shown here (managed in Pricing section only).

---

### SAA-035 — Edit Company dialog includes address, city, state, annual review count

**Module:** Companies | **Priority:** High

**Pre-conditions:** Company exists.

**Steps:**
1. Click "Edit Company" on the company detail page.
2. Verify all fields are present: Name, Contact Person, Email, Phone, Address, City, State, Annual Review Count, Notes, Itemize Invoices, Report Delivery, Report Bundle Delivery.

**Expected Result:** All fields are visible and editable. Per-review rate is NOT in this dialog (managed in Pricing section). No "(Phase 8.2)" label on Report Bundle Delivery. Dialog is scrollable if content overflows.

---

### SAA-036A — Per-review rate is managed only in Pricing section

**Module:** Companies — Pricing | **Priority:** Medium

**Pre-conditions:** Company exists with a per-review rate set.

**Steps:**
1. Open company detail page.
2. Verify per-review rate appears ONLY in the Pricing section.
3. Open Edit Company dialog — verify no per-review rate field.
4. Change rate in Pricing section and save.
5. Refresh page.

**Expected Result:** Rate change persists. Rate is shown only in Pricing section, not duplicated in Edit Company dialog or Company Details card.

---


## Prospects Pipeline — Navigation & Toast

### SAA-037A — Adding company from Prospects page stays on Prospects page

**Module:** Prospects | **Priority:** High

**Pre-conditions:** User is on the Prospects Pipeline page (/prospects).

**Steps:**
1. Click "Add New Company".
2. Fill in required fields (Name, Contact, Email, State).
3. Set Initial Status = Lead.
4. Click "Create Company".

**Expected Result:** Toast notification appears with solid white background and readable text. User stays on the Prospects page (not navigated away). The new company appears in the Lead column immediately without a full page refresh.

---

### SAA-038A — Adding company from Companies page navigates to detail page

**Module:** Companies | **Priority:** Medium

**Pre-conditions:** User is on the Companies page (/companies).

**Steps:**
1. Click "Add New Company".
2. Fill in required fields and submit.

**Expected Result:** After creation, user is navigated to the new company's detail page (/companies/{id}).

---

### SAA-039A — Toast notifications are readable on dark backgrounds

**Module:** UI | **Priority:** Medium

**Pre-conditions:** User is on a dark-themed page (e.g., Prospects Pipeline).

**Steps:**
1. Trigger any toast notification (create company, generate contract, etc.).

**Expected Result:** Toast has a solid white background with border and shadow. Text is clearly readable against any page background.

---

### SAA-040A — Pipeline board syncs after adding company

**Module:** Prospects | **Priority:** High

**Pre-conditions:** User is on the Prospects Pipeline page.

**Steps:**
1. Add a new company with status = Lead.
2. Observe the Lead column.

**Expected Result:** The new company card appears in the Lead column immediately. The column count badge updates. No full page reload required.

---


## Company Dropdowns — Status Filtering

### SAA-041A — Lead and archived companies excluded from operational dropdowns

**Module:** Companies — Dropdowns | **Priority:** High

**Pre-conditions:** Companies exist in various statuses including Lead and Archived.

**Steps:**
1. Navigate to Dashboard — check company filter dropdown.
2. Navigate to Forms page — check company filter and form builder company picker.
3. Navigate to Batches page — check batch wizard company selector.
4. Navigate to Invoices page — check company dropdown.

**Expected Result:** Lead and Archived companies do NOT appear in any of these dropdowns. Only companies in Prospect, Contract Sent, Contract Signed, Active, and Active Client statuses are shown. Batch and Invoice dropdowns are further restricted to Active and Active Client only.

---

### SAA-042A — Companies list page still shows all statuses

**Module:** Companies | **Priority:** Medium

**Pre-conditions:** Companies exist in all statuses including Lead and Archived.

**Steps:**
1. Navigate to /companies.
2. Check the full company list.

**Expected Result:** All companies are visible regardless of status, including Lead and Archived. This is the admin view for managing all companies.

---


## Forms — Form Identifier & Company Selector

### SAA-043A — Form builder shows company selector in create mode

**Module:** Forms | **Priority:** High

**Pre-conditions:** Multiple active companies exist.

**Steps:**
1. Navigate to Forms page.
2. Click "New Form".
3. Observe the form builder modal.

**Expected Result:** A "Company *" dropdown is visible at the top. It lists all non-lead, non-archived companies. User must select a company before creating the form.

---

### SAA-044A — Form builder shows company as read-only in edit mode

**Module:** Forms | **Priority:** Medium

**Pre-conditions:** A form exists for a company.

**Steps:**
1. On the Forms page, click Edit on an existing form.

**Expected Result:** The company is shown as a read-only field with a muted background. It cannot be changed. All other fields (specialty, form identifier, questions) are editable.

---

### SAA-045A — Form Identifier field and computed Form Name

**Module:** Forms | **Priority:** High

**Pre-conditions:** None.

**Steps:**
1. Open the form builder (create mode).
2. Select a company (e.g., "Aira").
3. Select a specialty (e.g., "Family Medicine").
4. Enter a Form Identifier (e.g., "Peer Review Form v1").

**Expected Result:** Fields are ordered: Company, Specialty, Form Identifier. Below the fields, a "Form Name:" preview shows the computed display name: "Aira - Family Medicine - Peer Review Form v1".

---

### SAA-046A — Form display name computed and stored correctly

**Module:** Forms | **Priority:** High

**Pre-conditions:** None.

**Steps:**
1. Create a new form: Company = "Sunrise", Specialty = "Pediatrics", Form Identifier = "Q2 Review".
2. Save the form.
3. Check the Forms list page.

**Expected Result:** The form_name in the database shows "Sunrise - Pediatrics - Q2 Review". The form_identifier shows "Q2 Review". The Forms list page displays the full computed name.

---

### SAA-047A — Editing form recomputes display name

**Module:** Forms | **Priority:** Medium

**Pre-conditions:** Form exists with identifier "Peer Review Form v1".

**Steps:**
1. Edit the form.
2. Change specialty from "Family Medicine" to "Pediatrics".
3. Save.

**Expected Result:** The form_name is recomputed to "{Company} - Pediatrics - Peer Review Form v1". The form_identifier remains unchanged.

---


## Specialty Dropdowns — Taxonomy API

### SAA-048A — All specialty dropdowns use taxonomy API

**Module:** Forms, Providers | **Priority:** High

**Pre-conditions:** Specialty taxonomy has 18+ active specialties.

**Steps:**
1. Open Form Builder — check specialty dropdown.
2. Open Add Provider dialog — check specialty dropdown.
3. Open Client Portal > Profile > Add Doctor — check specialty dropdown.

**Expected Result:** All three dropdowns show the same complete list of specialties from the taxonomy table (e.g., Family Medicine, Pediatrics, Cardiology, Acupuncture, Podiatry, etc.). No dropdown shows a hardcoded subset of 6.

---


## UI Cleanup

### SAA-049A — No internal test case IDs in user-facing UI

**Module:** UI | **Priority:** Low

**Pre-conditions:** None.

**Steps:**
1. Navigate to Pricing section on a company detail page.
2. Navigate to Settings page.
3. Check all helper text and labels.

**Expected Result:** No references to SA-xxx, SAA-xxx, or any internal test case IDs appear in the UI. Helper text reads naturally without internal codes.

---

### SAA-050A — Prospect card company name is clickable

**Module:** Prospects | **Priority:** Medium

**Pre-conditions:** Companies exist in the pipeline.

**Steps:**
1. Navigate to Prospects Pipeline page.
2. Click on a company name in any card.

**Expected Result:** Clicking the company name navigates to /companies/{id} (the company detail page). The name appears as a link with hover underline.

---


## Company Deduplication & Unique Names

### SAA-051 — Duplicate company names blocked at creation

**Module:** Companies | **Priority:** High

**Pre-conditions:** A company named "Hunter Health" already exists.

**Steps:**
1. Try to create a new company with the name "Hunter Health" via Add Company or Add Prospect.
2. Submit the form.

**Expected Result:** A 409 error is returned: "A company named 'Hunter Health' already exists." The duplicate is not created. The database has a unique constraint on company names.

---

### SAA-052A — No duplicate company rows in database

**Module:** Companies | **Priority:** High

**Pre-conditions:** None.

**Steps:**
1. Query the companies table: `SELECT name, count(*) FROM companies GROUP BY name HAVING count(*) > 1`

**Expected Result:** Zero rows returned. Every company name is unique. No archived duplicates from reseeds.

---


## Peer Status & Column Consistency

### SAA-053 — Peer lifecycle uses status column (not state)

**Module:** Peers | **Priority:** High

**Pre-conditions:** None.

**Steps:**
1. Check the peers table schema — verify there is a `status` column and NO `state` column.
2. Check the peer_state_audit table — verify columns are `from_status` and `to_status`.

**Expected Result:** The `state` column has been removed. All lifecycle tracking uses `status` (consistent with companies table). The `status_changed_at`, `status_changed_by`, `status_change_reason` columns exist.

---

### SAA-054 — Peer status filter shows all 7 statuses with proper capitalization

**Module:** Peers | **Priority:** Medium

**Pre-conditions:** None.

**Steps:**
1. Navigate to Peers page.
2. Click the Status filter dropdown.

**Expected Result:** All 7 statuses shown with proper capitalization: Active, Invited, Pending Admin Review, Pending Credentialing, License Expired, Suspended, Archived. Default filter is "Active". Statuses shown regardless of whether any peers have that status.

---

### SAA-055 — Specialty verification badges shown on Peers table

**Module:** Peers | **Priority:** Medium

**Pre-conditions:** Peers have specialties with different verification statuses.

**Steps:**
1. Navigate to Peers page.
2. Look at the Specialties column for each peer.

**Expected Result:** Each specialty badge is color-coded by verification status: Green with checkmark (verified), Amber with clock (pending), Red with X (not verified). Hovering shows tooltip with "Specialty — status".

---

### SAA-056 — Verification filter on Peers table

**Module:** Peers | **Priority:** Medium

**Pre-conditions:** Peers exist with mixed verification statuses.

**Steps:**
1. Navigate to Peers page.
2. Select "Has Unverified" from the Verification filter.
3. Select "All Verified" from the Verification filter.

**Expected Result:** "Has Unverified" shows only peers with at least one pending or not_verified specialty. "All Verified" shows only peers where every specialty is verified.

---


## Batch Wizard — Specialty & Cadence

### SAA-057 — Batch wizard shows all company specialties (not hardcoded list)

**Module:** Batches | **Priority:** High

**Pre-conditions:** Company has forms for 10+ specialties (including Cardiology, Acupuncture, Podiatry).

**Steps:**
1. Open New Batch wizard.
2. Select a company (e.g., Hunter Health).
3. Proceed to Step 2 (Specialty).

**Expected Result:** All specialties that have active forms for the selected company are shown. Not limited to a hardcoded 6-item list. Includes Acupuncture, Cardiology, Chiropractic, Podiatry, etc.

---

### SAA-058 — Batch name auto-fills from current cadence period (fiscal year aware)

**Module:** Batches | **Priority:** High

**Pre-conditions:** Hunter Health has quarterly cadence with FY starting April.

**Steps:**
1. Open New Batch wizard.
2. Select Hunter Health.
3. Proceed to Step 4 (Batch details).

**Expected Result:** Batch name auto-fills with the current fiscal year period (e.g., "Q1 2026" for Apr-Jun if FY starts April). NOT calendar quarter Q2. Shows "Auto-filled from current cadence period. Edit to override."

---


## AI PDF Metadata Extraction

### SAA-059 — AI extracts provider name from PDF content

**Module:** Batches — AI Extraction | **Priority:** High

**Pre-conditions:** Upload a PDF chart that contains a provider signature (e.g., "Electronically signed by Julia L Adee CNP").

**Steps:**
1. Open New Batch wizard, select company and specialty, proceed to Step 4.
2. Upload a PDF file with a generic filename (e.g., "Test.pdf") that doesn't contain the provider name.
3. Wait for "AI extracting..." spinner to complete.

**Expected Result:** The provider dropdown auto-fills with the provider extracted from the PDF content (matching against the company's provider list by last name). If no match found, dropdown remains blank ("Pick provider...").

---

### SAA-060 — AI extracts encounter date from PDF content

**Module:** Batches — AI Extraction | **Priority:** High

**Pre-conditions:** Upload a PDF chart that contains "Visit Date: 11/29/25" or similar.

**Steps:**
1. Upload a PDF in the batch wizard.
2. Wait for AI extraction to complete.

**Expected Result:** The encounter date field auto-fills with the extracted date in YYYY-MM-DD format (e.g., "2025-11-29"). Two-digit years are converted to 2000s.

---

### SAA-061 — Filename parsing handles multiple naming patterns

**Module:** Batches | **Priority:** Medium

**Pre-conditions:** None.

**Steps:**
1. Upload files with various naming patterns:
   - "Family Coicou 1.pdf" → Provider: Coicou, Specialty: Family Medicine
   - "100190770_OB_Fielder.pdf" → Provider: Fielder, Specialty: OB/GYN
   - "BH Smith 1.pdf" → Provider: Smith, Specialty: Behavioral Health
   - "Mental Health. Concepcion. Q4.2.pdf" → Provider: Concepcion, Specialty: Mental Health
   - "GILMORE 4.pdf" → Provider: Gilmore, Specialty: null

**Expected Result:** Provider dropdown auto-fills based on last name match. Specialty extracted from filename keywords. Files where filename can't determine provider show "AI extracting..." spinner and fall back to PDF content analysis.

---

### SAA-062 — Provider dropdown blank when no match found

**Module:** Batches | **Priority:** Medium

**Pre-conditions:** Upload a file where neither filename nor PDF content matches a company provider.

**Steps:**
1. Upload a PDF with an unrecognizable filename and provider not in the company's list.

**Expected Result:** Provider dropdown shows "Pick provider..." (blank). Does NOT default to the first provider. User must select manually.

---


## Navigation Cleanup

### SAA-063 — Sidebar shows Reviews and AI Assignments

**Module:** Navigation | **Priority:** High

**Pre-conditions:** Logged in as admin.

**Steps:**
1. Check the sidebar navigation.

**Expected Result:** Workspace section has "Reviews" (links to /assignments — master case list with filters). Admin Tools section has "AI Assignments" (links to /assign — AI approval queue). The old redundant "Reviews" (/cases) link is gone.

---

### SAA-064 — Batch detail shows View AI Queue button

**Module:** Batches | **Priority:** Medium

**Pre-conditions:** A batch has cases in pending_approval status.

**Steps:**
1. Navigate to a batch detail page with pending_approval cases.

**Expected Result:** A "View AI Queue" button appears next to the "Run AI Assignment" button. Clicking it navigates to /assign (AI assignment approval queue).

---

### SAA-065 — After AI assignment, dialog shows Review & Approve link

**Module:** Batches | **Priority:** Medium

**Pre-conditions:** A batch has unassigned cases.

**Steps:**
1. Click "Run AI Assignment" on a batch.
2. Confirm and run.
3. Wait for completion.

**Expected Result:** Success dialog shows "Review & Approve" button that links to /assign. Admin can navigate directly to the approval queue.

---


## Reviews Table — Status-Appropriate Actions

### SAA-066 — Completed cases have no action buttons

**Module:** Reviews | **Priority:** High

**Pre-conditions:** Cases exist in completed status.

**Steps:**
1. Navigate to Reviews page.
2. Filter by "Completed" status.

**Expected Result:** No Approve, Reassign, or Unassign buttons shown for completed cases. Case Ref is still clickable (links to case detail). Completed cases are immutable (SA-070).

---

### SAA-067 — Pending approval cases show Approve button

**Module:** Reviews | **Priority:** High

**Pre-conditions:** Cases exist in pending_approval status.

**Steps:**
1. Navigate to Reviews page.
2. Filter by "Pending approval" status.
3. Click "Approve" on a case.

**Expected Result:** Approve button shown (green). Clicking it transitions the case to "assigned" status, sets due date to 7 days from now, increments peer's active case count. Page refreshes to show updated status.

---

### SAA-068 — Case Ref is clickable link to case detail

**Module:** Reviews | **Priority:** Medium

**Pre-conditions:** Cases exist.

**Steps:**
1. Navigate to Reviews page.
2. Click on a Case Ref (e.g., #77140d38).

**Expected Result:** Navigates to /cases/{id} — the case detail page showing provider, peer, chart, AI analysis, and review form.

---


## In-Cycle Status Removed

### SAA-069 — In Cycle status removed from all UI and code

**Module:** Companies | **Priority:** Medium

**Pre-conditions:** None.

**Steps:**
1. Check Prospects pipeline — verify no "In Cycle" column.
2. Check Companies page status filter — verify no "In Cycle" option.
3. Check Company Header badges — verify no purple "in cycle" badge.

**Expected Result:** The in_cycle status is completely removed. Company flow is: Lead → Prospect → Contract Sent → Contract Signed → Active Client → Archived. Pipeline board shows 5 columns.

---


## Specialties — Taxonomy API

### SAA-070A — New specialties added to taxonomy

**Module:** Settings — Specialties | **Priority:** Medium

**Pre-conditions:** None.

**Steps:**
1. Navigate to Settings → Specialty Taxonomy tab.
2. Verify these specialties exist: Gynecology, Mental Health, Obstetrics, Primary Care (in addition to the original set).

**Expected Result:** All specialties appear in the taxonomy and are active. They show in all specialty dropdowns across the application (forms, providers, batches, etc.).

---
