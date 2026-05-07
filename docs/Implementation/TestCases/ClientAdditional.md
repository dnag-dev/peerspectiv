# Client — Additional Test Cases

> These test cases cover features added during Phase 9A (Testing Fixes & Enhancements). They supplement the original Client.md test cases.

---


## Files

### CLA-001 — Client files page shows all uploaded batches

**Module:** Files | **Priority:** High

**Pre-conditions:** Client has uploaded batches.

**Steps:**
1. Login as Client.
2. Click "My Files" in sidebar.

**Expected Result:** Table shows: Batch Name, Specialty, Upload Date, Files count, Completed count, Status. Expired batches (>30 days since upload) show "Expired" badge in red.

---

### CLA-002 — Click batch to view individual files

**Module:** Files | **Priority:** Medium

**Pre-conditions:** Batch exists with uploaded files.

**Steps:**
1. Click a batch row in My Files.
2. Observe the drill-in page.

**Expected Result:** Shows individual files: File Name (with icon), Provider name, Specialty, Status badge, Upload date, Download link. Back button returns to My Files.

---

### CLA-003 — Expired batches indicator

**Module:** Files | **Priority:** Medium

**Pre-conditions:** Batch uploaded more than 30 days ago.

**Steps:**
1. View My Files page.
2. Locate the old batch.

**Expected Result:** "Expired" badge shown in red. Non-expired batches show their normal status.

---


## Forms

### CLA-004 — Client can view forms (read-only)

**Module:** Forms | **Priority:** Medium

**Pre-conditions:** Company has active forms configured.

**Steps:**
1. Login as Client.
2. Click "Forms" in sidebar.

**Expected Result:** Read-only table shows: Form Name, Specialty, Questions count, Status (Active/Inactive with dot-prefix Badge matching admin style). No edit, delete, or clone actions visible. Client cannot modify forms.

---


## Credentials (Credentialer View)

### CLA-005 — Credentialer credentials page shows specialties

**Module:** Credentials | **Priority:** High

**Pre-conditions:** Peers have specialties assigned.

**Steps:**
1. Login as Credentialer.
2. Navigate to Credentials page.

**Expected Result:** Specialties column shows assigned specialties for each peer (not "—"). Same data as admin Credentials page.

---


## Client Portal — Reviews Page Consolidation

### CLA-006 — Single "Reviews" link replaces three sidebar items

**Module:** Client Portal — Navigation | **Priority:** High

**Pre-conditions:** Logged in as client.

**Steps:**
1. Check the sidebar under "Reviews" group.

**Expected Result:** Single "Reviews" link (no separate "All Reviews", "In Progress", "Overdue"). All status filtering happens via chips on the Reviews page.

---

### CLA-007 — Reviews page defaults to Unassigned + Pending approval selected

**Module:** Client Portal — Reviews | **Priority:** High

**Pre-conditions:** Cases exist in various statuses for this company.

**Steps:**
1. Click "Reviews" in the sidebar.
2. Observe the status chips and displayed cases.

**Expected Result:** "Unassigned" and "Pending approval" chips are pre-selected (highlighted blue). Only cases in those statuses are shown. Other chips can be toggled on/off.

---

### CLA-008 — Status chips support multi-select toggle

**Module:** Client Portal — Reviews | **Priority:** Medium

**Pre-conditions:** None.

**Steps:**
1. Click "Completed" chip to add it.
2. Click "Unassigned" chip to remove it.
3. Click "Assigned" chip to add it.

**Expected Result:** Multiple chips can be selected simultaneously. Clicking a selected chip deselects it. Table shows cases matching ANY selected status. No chips selected = all cases shown.

---

### CLA-009A — Status chips match admin order

**Module:** Client Portal — Reviews | **Priority:** Medium

**Pre-conditions:** None.

**Steps:**
1. Check the order of status chips on the client Reviews page.

**Expected Result:** Chips in order: Unassigned, Pending approval, Assigned, In progress, Completed, Past due. Same order as admin Reviews page. No "All" chip.

---

### CLA-010 — Reviews table shows Batch column instead of Quarter

**Module:** Client Portal — Reviews | **Priority:** Medium

**Pre-conditions:** Cases exist with batch associations.

**Steps:**
1. Navigate to client Reviews page.
2. Check the table columns.

**Expected Result:** Columns: Chart, Provider, Specialty, Status, Due, Batch. "Batch" shows the batch name (e.g., "Q4 2025"). No "Quarter" column.

---

### CLA-011 — Chart filename is clickable link

**Module:** Client Portal — Reviews | **Priority:** Medium

**Pre-conditions:** Cases have uploaded chart files with file paths.

**Steps:**
1. Navigate to client Reviews page.
2. Click a chart filename in the Chart column.

**Expected Result:** PDF opens in a new browser tab. Filename is blue and shows hover underline. Files without a URL show as plain text.

---

### CLA-012A — Text input filters match admin style

**Module:** Client Portal — Reviews | **Priority:** Medium

**Pre-conditions:** None.

**Steps:**
1. Navigate to client Reviews page.
2. Check the filter area below the chips.

**Expected Result:** Four text/date inputs in a row: Provider (text), Specialty (text), Start date (date picker), End date (date picker). White card background with subtle border. Matches admin Reviews page styling.

---

### CLA-013B — Provider filter searches by partial name

**Module:** Client Portal — Reviews | **Priority:** Medium

**Pre-conditions:** Cases exist for multiple providers.

**Steps:**
1. Type "Coicou" in the Provider filter.

**Expected Result:** Only cases for providers matching "Coicou" are shown. Partial match, case-insensitive.

---

### CLA-014A — Date range filter works

**Module:** Client Portal — Reviews | **Priority:** Medium

**Pre-conditions:** Cases exist with various created dates.

**Steps:**
1. Set start date to 2026-05-01.
2. Set end date to 2026-05-07.

**Expected Result:** Only cases created between May 1-7, 2026 are shown.

---


## Charts — Clickable Links

### CLA-015 — Chart file clickable on case detail page

**Module:** Cases | **Priority:** Medium

**Pre-conditions:** A case has an uploaded chart with a file path.

**Steps:**
1. Navigate to a case detail page (admin or client).
2. Look at the "Chart File" section.

**Expected Result:** Filename is a clickable blue link. Clicking opens the PDF in a new tab. Files without a stored URL show as plain text.

---

### CLA-016 — Chart file clickable on batch detail page

**Module:** Batches | **Priority:** Medium

**Pre-conditions:** A batch has cases with uploaded charts.

**Steps:**
1. Navigate to a batch detail page.
2. Look at the "Chart" column in the cases table.

**Expected Result:** Chart filenames are clickable blue links that open the PDF in a new tab.

---


## Client Reviews — Returned by Peer Status

### CLA-017 — Client Reviews page shows "Returned by peer" status chip

**Module:** Client Portal — Reviews | **Priority:** Medium

**Pre-conditions:** A case has been returned by a peer.

**Steps:**
1. Login as client.
2. Navigate to Reviews page.
3. Toggle the "Returned by peer" status chip.

**Expected Result:** "Returned by peer" chip is available in the status chip bar. When selected, cases with status `returned_by_peer` are shown. The chip follows the same multi-select toggle behavior as other status chips.

---


## Client Portal — Forms Page

### CLA-018 — Form names visible and clickable on client Forms page

**Module:** Client Portal — Forms | **Priority:** High

**Pre-conditions:** Company has active forms configured.

**Steps:**
1. Login as client.
2. Navigate to Forms page.

**Expected Result:** Form names are visible as blue clickable links (not invisible/white text). Table has white background with gray header. Columns: Form Name, Specialty, Questions, Status.

---

### CLA-019 — Client can view form detail (read-only)

**Module:** Client Portal — Forms | **Priority:** High

**Pre-conditions:** Forms exist for the client's company.

**Steps:**
1. Click a form name on the Forms list page.
2. Observe the form detail page.

**Expected Result:** Shows read-only table of all questions: #, Question text, Type (Yes/No/NA, A/B/C/NA, Text), Default Answer, Required (Yes/No). Back link to forms list. No edit, delete, or modify actions available. Form name and specialty shown in header.

---

### CLA-020A — Client form detail shows correct question count and types

**Module:** Client Portal — Forms | **Priority:** Medium

**Pre-conditions:** Form exists with mixed question types.

**Steps:**
1. Navigate to form detail page.
2. Verify question count matches the Forms list page.
3. Check question types display correctly.

**Expected Result:** Question count matches. Types show as: "Yes / No / NA", "A / B / C / NA", "Text". Default answers show the configured value or "—" if none.

---


## Client Portal — Overdue Page

### CLA-021A — Chart filenames clickable on client Overdue page

**Module:** Client Portal — Overdue | **Priority:** Medium

**Pre-conditions:** Past-due cases exist with uploaded chart files.

**Steps:**
1. Navigate to client Overdue page.
2. Click a chart filename on a card.

**Expected Result:** PDF opens in a new browser tab. Filename is blue with hover underline. Cards without file URLs show plain text.

---


## Returned by Peer — Client vs Admin Display

### CLA-022 — Returned by peer shows neutral color on client pages

**Module:** Client Portal — Reviews | **Priority:** Medium

**Pre-conditions:** A case has been returned by a peer.

**Steps:**
1. As client, navigate to Reviews and filter by "Returned by peer".
2. Observe the status badge color.

**Expected Result:** Status badge shows in neutral gray/slate (not red). Client doesn't need to act on returned cases — that's the admin's responsibility.

---


## Client Reviews — Server-Side Filtering

### CLA-023 — Client Reviews uses server-side filtering

**Module:** Client Portal — Reviews | **Priority:** High

**Pre-conditions:** Cases exist for the client's company.

**Steps:**
1. Login as client.
2. Navigate to Reviews page.
3. Type in Provider filter and press Enter or click outside.
4. Toggle status chips.

**Expected Result:** Filters trigger server-side queries (URL updates with params). Text inputs apply on blur/Enter (not as-you-type). Date pickers apply immediately. Scales to large datasets.

---


## Client Portal — Batches (replaces Submit Records + My Files)

### CLA-024 — Sidebar shows Batches instead of Submit Records and My Files

**Module:** Client Portal — Navigation | **Priority:** High

**Pre-conditions:** Logged in as client.

**Steps:**
1. Check the sidebar under "Overview" group.

**Expected Result:** "Batches" link is shown. No "Submit Records" or "My Files" links. Clicking "Batches" navigates to /portal/batches.

---

### CLA-025A — Client Batches page shows only company batches

**Module:** Client Portal — Batches | **Priority:** High

**Pre-conditions:** Batches exist for the client's company and other companies.

**Steps:**
1. Navigate to /portal/batches.

**Expected Result:** Only batches belonging to the client's company are shown. Columns: Batch Name (clickable), Specialty, Upload Date, Cases, Completed, Status. Batches from other companies are NOT visible.

---

### CLA-026 — Client can create new batch (4-step wizard)

**Module:** Client Portal — Batches | **Priority:** High

**Pre-conditions:** Company has forms and providers configured.

**Steps:**
1. Click "New Batch" on the Batches page.
2. Observe the wizard steps.

**Expected Result:** Wizard has 4 steps (not 5 — company step is skipped, auto-set to client's company). Steps: 1) Specialty, 2) Form selection, 3) Batch details + upload PDFs, 4) Review & submit. Step counter shows "Step N of 4".

---

### CLA-027 — Batch name links to batch detail

**Module:** Client Portal — Batches | **Priority:** Medium

**Pre-conditions:** Batches exist.

**Steps:**
1. Click a batch name on the Batches list page.

**Expected Result:** Navigates to batch detail page showing cases, status, and upload info.

---


## Client Portal — Forms Management

### CLA-028 — Client can edit forms

**Module:** Client Portal — Forms | **Priority:** High

**Pre-conditions:** Forms exist for the client's company.

**Steps:**
1. Navigate to Forms page.
2. Click "Edit" on a form.

**Expected Result:** FormBuilderModal opens in edit mode. Company is auto-set (not editable). Mode selector (Upload PDF/Clone/From scratch), AI narrative checkbox, and Draft with AI button are hidden. Client sees only: Specialty, Form Identifier, Form Name preview, and Fields editor.

---

### CLA-029 — Client can clone forms

**Module:** Client Portal — Forms | **Priority:** Medium

**Pre-conditions:** Forms exist.

**Steps:**
1. Click "Clone" on a form.

**Expected Result:** FormBuilderModal opens pre-filled with the form's data. Form Identifier shows "(Copy)" suffix. Client can modify and save as a new form.

---

### CLA-030 — Client can create new form (simplified modal)

**Module:** Client Portal — Forms | **Priority:** High

**Pre-conditions:** None.

**Steps:**
1. Click "New Form" button on Forms page.
2. Fill in Specialty and Form Identifier.
3. Add questions.
4. Click "Create form".

**Expected Result:** Form created for the client's company. No mode tabs, AI narrative, Draft with AI, or company picker shown. Form appears in the list after creation.

---


## Case Detail — Returned by Peer Status

### CLA-031 — Case detail shows "Returned by Peer" (not "Unassigned")

**Module:** Cases | **Priority:** High

**Pre-conditions:** A case has been returned by a peer.

**Steps:**
1. Navigate to the case detail page for a returned case.

**Expected Result:** Status badge shows "Returned by Peer" in red. Does NOT show "Unassigned" (previous bug where returned_by_peer was missing from badge config).

---


## Admin Reviews — Batch Column

### CLA-032 — Admin Reviews shows Batch column instead of Notes

**Module:** Admin Reviews | **Priority:** Medium

**Pre-conditions:** Cases exist with batch associations.

**Steps:**
1. As admin, navigate to Reviews page.

**Expected Result:** Table shows "Batch" column (batch name like "Q4 2025") instead of "Notes". Returned by peer reason appears as small red text under the status badge, not in a separate column.

---
