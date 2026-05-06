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
