# Peer / Reviewer — Additional Test Cases

> These test cases cover features added during Phase 9A (Testing Fixes & Enhancements). They supplement the original PeerReviewer.md test cases.

---


## Save & Exit

### PRA-001 — Save & Exit preserves QA answers across sessions

**Module:** Conduct Review | **Priority:** High

**Pre-conditions:** Peer has an assigned, in-progress case.

**Steps:**
1. Open review for a case.
2. Answer 3 of 10 questions (Yes/No/NA selections).
3. Type some text in the comments field.
4. Click "Save & Exit" button at the bottom of the form.
5. Verify navigation back to peer portal.
6. Reopen the same case review.

**Expected Result:** The 3 previously answered questions retain their selections. Comments text is preserved. MRN and license fields are NOT pre-filled from the draft (they come from the database/AI instead). No data loss.

---

### PRA-002 — Draft cleared on successful submit

**Module:** Conduct Review | **Priority:** Medium

**Pre-conditions:** Peer has a partially saved draft for a case.

**Steps:**
1. Open the case with existing draft.
2. Complete all required fields.
3. Submit the review.
4. Open browser DevTools > Application > localStorage.

**Expected Result:** The `peerspectiv.draft.{caseId}` key is removed from localStorage after successful submit.

---

### PRA-003 — Draft auto-saves every second (debounced)

**Module:** Conduct Review | **Priority:** Low

**Pre-conditions:** Peer is on a review form.

**Steps:**
1. Answer a question.
2. Wait 2 seconds.
3. Open DevTools > Application > localStorage.
4. Inspect `peerspectiv.draft.{caseId}`.

**Expected Result:** Draft JSON reflects the latest answer within 1-2 seconds. Auto-saves without requiring manual "Save & Exit" click.

---


## MRN

### PRA-004 — MRN field strips HTML tags

**Module:** Conduct Review | **Priority:** High

**Pre-conditions:** Peer is on a review form.

**Steps:**
1. In MRN field, type: `<script>alert(1)</script>`
2. Observe the field value.

**Expected Result:** HTML tags are stripped. Field shows `alert(1)` with no markup. No script execution.

---


## Peer Portal — Scoping & Data Isolation

### PRA-005 — Peer portal shows only the logged-in peer's cases

**Module:** Peer Portal | **Priority:** Critical

**Pre-conditions:** Multiple peers have cases assigned. Log in as Dr. Richard Johnson (demo peer).

**Steps:**
1. Navigate to My Queue (peer portal).
2. Observe the status circle counts (In Progress, Completed, Incomplete).
3. Click each status circle and inspect the cases shown.

**Expected Result:** Only Dr. Richard Johnson's cases are shown — not cases assigned to other peers (Mark McGranahan, Shannon Schrader, etc.). Status circle counts reflect only this peer's cases. The "8 cases matching status: completed" text matches the actual number of this peer's completed reviews.

---

### PRA-006 — Peer portal status badges reflect actual case status

**Module:** Peer Portal | **Priority:** High

**Pre-conditions:** Peer has cases in multiple statuses (assigned, in_progress, completed).

**Steps:**
1. Click "In Progress" circle — inspect card badges.
2. Click "Completed" circle — inspect card badges.

**Expected Result:**
- In Progress tab: cards show amber "In progress" or neutral "Assigned" badges with "Start review" button.
- Completed tab: cards show green "Completed" badge with "View review" button (not "Start review"). Due date is hidden for completed cases.
- No status shows "Assigned" when the case is actually completed.

---

### PRA-007 — Completed cases show "View review" button (not "Start review")

**Module:** Peer Portal | **Priority:** Medium

**Pre-conditions:** Peer has completed reviews.

**Steps:**
1. Click "Completed" status circle.
2. Inspect button text on each card.

**Expected Result:** Every card shows "View review →" button. No card shows "Start review" or "Open prefilled review". Clicking "View review" navigates to the case detail with the submitted review data.

---

### PRA-008 — Due date hidden on completed case cards

**Module:** Peer Portal | **Priority:** Low

**Pre-conditions:** Peer has completed reviews.

**Steps:**
1. Click "Completed" status circle.
2. Inspect cards for due date text.

**Expected Result:** No "Due May 17 (11d)" or similar due date text appears on completed cards. Due dates are only relevant for in-progress and assigned cases.

---


## Peer Portal — Search & View Toggle

### PRA-009 — Peer portal search filters cases

**Module:** Peer Portal | **Priority:** Medium

**Pre-conditions:** Peer has multiple cases with different providers and companies.

**Steps:**
1. Type a provider name (e.g., "Julia") in the search bar.
2. Observe filtered results.
3. Clear and type a company name (e.g., "Hunter").
4. Clear and type a specialty (e.g., "OB/GYN").

**Expected Result:** Cards filter in real-time by provider name, company name, or specialty. Search works in both Cards and List view modes.

---

### PRA-010 — Peer portal Cards/List view toggle

**Module:** Peer Portal | **Priority:** Medium

**Pre-conditions:** Peer has cases assigned.

**Steps:**
1. Default view is "Cards" — verify card grid is shown.
2. Click "List" toggle button.
3. Verify table view with columns: Provider, Company, Specialty, Status, Due, AI, Chart.
4. Click "Cards" to switch back.

**Expected Result:** Both views show the same cases. Toggle persists within the session. List view shows sortable columns with clickable provider names linking to case detail.

---


## Peer Portal — Case Grouping

### PRA-011 — Cases group by provider + batch period

**Module:** Peer Portal | **Priority:** High

**Pre-conditions:** Peer has 2+ cases for the same provider in the same batch period (e.g., 2 Julia Adee charts in Q4 2025).

**Steps:**
1. Navigate to My Queue.
2. Find the provider card.

**Expected Result:** Cases for the same provider + period are grouped into a single card showing an "N charts" badge (e.g., "2 charts"). Clicking "Open charts" navigates to the multi-chart tabbed review page. Cases with different providers or different periods remain as separate cards.

---

### PRA-012 — Multi-chart group page shows only this peer's charts

**Module:** Peer Portal | **Priority:** Critical

**Pre-conditions:** Provider has charts assigned to multiple peers (e.g., Julia Adee has 3 charts in Q4 2025: 2 assigned to Dr. Johnson, 1 assigned to Sangeeta Wagner).

**Steps:**
1. Log in as Dr. Johnson.
2. Click "Open charts" on the Julia Adee grouped card.
3. Count the tabs on the multi-chart review page.

**Expected Result:** Only 2 tabs shown (Dr. Johnson's charts). The 3rd chart (Sangeeta Wagner's) is NOT visible. Header shows "2 charts" not "3 charts". Each peer only sees charts assigned to them.

---

### PRA-013 — Batch period label shows on all case cards

**Module:** Peer Portal | **Priority:** Medium

**Pre-conditions:** Cases have batch periods assigned (e.g., Q4 2025, Q1 2026).

**Steps:**
1. Navigate to My Queue.
2. Inspect the subtitle on each card.

**Expected Result:** Every card shows the period label in the subtitle (e.g., "Family Medicine · Hunter Health · Q4 2025"). No card shows a missing period when the case belongs to a batch with a known cadence period.

---


## Peer Portal — Counter Accuracy

### PRA-014 — Peer counter fields match actual case data

**Module:** Peers | **Priority:** High

**Pre-conditions:** Peer has a mix of assigned, in_progress, and completed cases.

**Steps:**
1. Check the peers table: `active_cases_count` and `total_reviews_completed`.
2. Count actual cases: assigned + in_progress = active, completed = total.

**Expected Result:** `active_cases_count` = number of assigned + in_progress cases. `total_reviews_completed` = number of completed cases. No stale seed values (e.g., a peer with 2 completed cases should not show `total_reviews_completed = 467`).

---


## Review Form — Field Types & Validation

### PRA-015 — Yes/No/NA questions render as radio buttons (not text fields)

**Module:** Conduct Review | **Priority:** Critical

**Pre-conditions:** A form has questions with field_type = yes_no_na (e.g., "Was documentation complete?").

**Steps:**
1. Open a case review as a peer.
2. Inspect each question.

**Expected Result:** Every Yes/No/NA question renders as three radio-style buttons (Yes, No, N/A). No question that should be Yes/No/NA renders as a text input. Only "Comments and Recommendations" and similar freeform fields render as textareas.

---

### PRA-016 — No "DEFAULT — PLEASE VERIFY" badge on form questions

**Module:** Conduct Review | **Priority:** Medium

**Pre-conditions:** A form has questions with default answers configured.

**Steps:**
1. Open a case review.
2. Inspect all questions for badge labels.

**Expected Result:** No "DEFAULT — PLEASE VERIFY" badge appears on any question. Default answers silently pre-select the button (e.g., "Yes" highlighted). AI prefill badges (high/medium/low confidence) still appear when AI provides values.

---

### PRA-017 — Comment required when answer differs from default

**Module:** Conduct Review | **Priority:** High

**Pre-conditions:** A form question has default_answer = "yes" and required_text_on_non_default = true.

**Steps:**
1. Open a case review.
2. On a question with default "Yes", click "No".
3. Observe the comment textarea.
4. Try to submit without entering a comment.

**Expected Result:** When "No" is selected (differs from default "Yes"), the comment textarea highlights with an amber border and placeholder changes to "Required: explain why your answer differs from the expected default". Submit is blocked with a validation error until the comment is filled in. Selecting "N/A" does NOT require a comment.

---

### PRA-018 — Save & Next Chart button in multi-chart reviews

**Module:** Conduct Review | **Priority:** High

**Pre-conditions:** Peer has 2+ charts for the same provider in the same batch period (multi-chart group review).

**Steps:**
1. Open the grouped review (e.g., "Julia Adee · Q4 2025 (2 charts)").
2. On Chart 1, answer some questions.
3. Click "Save & Next Chart →" in the footer.
4. Observe what happens.

**Expected Result:** Draft is saved. View switches to Chart 2 tab. Page scrolls to top. Chart 1 answers are preserved (can switch back to verify). The "Save & Next Chart →" button only appears in multi-chart mode — not on single-chart reviews.

---

### PRA-019 — Return case clears saved draft

**Module:** Conduct Review | **Priority:** High

**Pre-conditions:** Peer has a case with partial answers saved (draft exists in localStorage).

**Steps:**
1. Open the case and verify answers are loaded from draft.
2. Click "Return case".
3. Enter a reason (min 10 chars) and confirm.
4. Check localStorage in browser DevTools.

**Expected Result:** After returning the case, `peerspectiv.draft.{caseId}` is removed from localStorage. Peer is redirected to My Queue. The case no longer appears in the peer's queue. If the case is reassigned to the same peer later, they start with a clean form.

---

### PRA-020 — Return case decrements peer active count

**Module:** Conduct Review | **Priority:** Medium

**Pre-conditions:** Peer has active_cases_count = 5 with one in_progress case.

**Steps:**
1. Return the in_progress case.
2. Check the peer's active_cases_count.

**Expected Result:** active_cases_count decremented to 4. The returned case no longer counts toward the peer's capacity.

---

### PRA-021 — Return case and Request reassignment hidden on completed reviews

**Module:** Conduct Review | **Priority:** High

**Pre-conditions:** A completed review exists with a submitted result.

**Steps:**
1. Open the completed review as the peer (via "View review" on Completed tab).
2. Check the top-right action buttons.

**Expected Result:** No "Return case" button shown. Completed reviews are immutable — the peer cannot return or request reassignment after submission.

---

### PRA-022 — Only Return Case action available (no Request Reassignment)

**Module:** Conduct Review | **Priority:** Medium

**Pre-conditions:** Peer has an assigned or in_progress case.

**Steps:**
1. Open the case review.
2. Check the top-right action buttons.

**Expected Result:** Only "Return case" button shown (red outline with undo icon). No "Request reassignment" button. Return case is the single canonical action for declining a case (PR-030).

---
