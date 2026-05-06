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

**Expected Result:** Read-only table shows: Form Name, Specialty, Questions count, Status (Active/Inactive). No edit, delete, or clone actions visible. Client cannot modify forms.

---
