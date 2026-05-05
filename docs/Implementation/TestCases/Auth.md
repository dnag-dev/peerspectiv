# Authentication & Cross-Cutting — Test Cases

> These tests apply to ALL three personas. Run them first for each test account (Super Admin, Client, Peer) before moving on to persona-specific sheets.

---


## Login Page

### AU-001 — Login page loads with correct branding

**Module:** Login Page | **Priority:** High

**Pre-conditions:** Application URL accessible.

**Steps:**
1. Open the application URL in a browser.
2. Observe the login screen layout.

**Test Data:** _(none)_

**Expected Result:** Split-screen login page loads. 'Peerspectiv' logo and 'All better.' tagline visible. Email field, password field, Remember Me checkbox, Login button, and Forgot Password link are all visible.

---

### AU-002 — Login with valid Super Admin credentials

**Module:** Login Page | **Priority:** Critical

**Pre-conditions:** Valid Super Admin test account exists.

**Steps:**
1. Enter Super Admin email in Email field.
2. Enter correct password in Password field.
3. Click Login button.

**Test Data:** Email: <super admin email>
Password: <correct>

**Expected Result:** User is redirected to Super Admin Dashboard with greeting, status cards (Unassigned/In Progress/Past Due), and full sidebar menu (Dashboard, Reviews, Reports, Peers, Companies, Forms, Tags, Settings, Tasks, Log Out).

---

### AU-003 — Login with valid Client credentials

**Module:** Login Page | **Priority:** Critical

**Pre-conditions:** Valid Client test account exists.

**Steps:**
1. Enter Client email.
2. Enter correct password.
3. Click Login.

**Test Data:** Email: <client email>
Password: <correct>

**Expected Result:** User is redirected to Client Dashboard with Average Score donut chart, review tabs (All/Complete/Unassigned), Create A Report widget, Recent Files widget, and Client sidebar (Dashboard, Reviews, Reports, Files, Upload File, Profile, Forms, Log Out).

---

### AU-004 — Login with valid Peer/Reviewer credentials

**Module:** Login Page | **Priority:** Critical

**Pre-conditions:** Valid Peer test account exists.

**Steps:**
1. Enter Peer email.
2. Enter correct password.
3. Click Login.

**Test Data:** Email: <peer email>
Password: <correct>

**Expected Result:** User is redirected to Peer Dashboard with greeting, 3 status circles (Completed/In-Progress/Incomplete), assignment table, and minimal sidebar (Dashboard, Profile, Log Out).

---

### AU-005 — Login with invalid password

**Module:** Login Page | **Priority:** High

**Pre-conditions:** Valid email exists.

**Steps:**
1. Enter valid email.
2. Enter incorrect password.
3. Click Login.

**Test Data:** Email: valid
Password: wrong

**Expected Result:** Login is rejected. An error message such as 'These credentials do not match our records' appears. User remains on login page.

---

### AU-006 — Login with non-existent email

**Module:** Login Page | **Priority:** High

**Pre-conditions:** —

**Steps:**
1. Enter email that does not exist in the system.
2. Enter any password.
3. Click Login.

**Test Data:** Email: notarealuser_qa@example.com

**Expected Result:** Login rejected with generic error (does not confirm whether email exists, for security). User remains on login page.

---

### AU-007 — Login with empty fields

**Module:** Login Page | **Priority:** Medium

**Pre-conditions:** —

**Steps:**
1. Leave Email and Password fields blank.
2. Click Login.

**Test Data:** _(none)_

**Expected Result:** Form does not submit. Inline validation messages appear under both Email and Password fields (e.g., 'The email field is required').

---

### AU-008 — Login with malformed email

**Module:** Login Page | **Priority:** Medium

**Pre-conditions:** —

**Steps:**
1. Enter 'notanemail' in Email field.
2. Enter any password.
3. Click Login.

**Test Data:** _(none)_

**Expected Result:** Browser/server validation rejects malformed email. Error: 'Please include an @ in the email address' or similar.

---

### AU-009 — Remember Me persists session

**Module:** Login Page | **Priority:** Medium

**Pre-conditions:** Valid credentials.

**Steps:**
1. Enter valid credentials.
2. Check 'Remember Me' checkbox.
3. Click Login. Confirm dashboard loads.
4. Close the browser tab completely.
5. Reopen the application URL in a new tab.

**Test Data:** _(none)_

**Expected Result:** User is automatically logged in (still authenticated) without entering credentials again.

---


## Forgot Password

### AU-010 — Forgot Password link sends reset email

**Module:** Forgot Password | **Priority:** High

**Pre-conditions:** Valid registered email; access to that mailbox.

**Steps:**
1. On login page, click 'Forgot your password?'.
2. Enter a valid registered email.
3. Click Email Password Reset Link.
4. Check inbox.

**Test Data:** _(none)_

**Expected Result:** Confirmation message shown ('We have emailed your password reset link!'). Email arrives with reset link within 2 minutes.

---

### AU-011 — Password reset link works and updates password

**Module:** Forgot Password | **Priority:** High

**Pre-conditions:** AU-010 succeeded; reset email received.

**Steps:**
1. Click reset link in email.
2. Enter a new password (meets complexity).
3. Confirm new password.
4. Click Reset Password.
5. Log in with new password.

**Test Data:** New password: <strong, 12+ chars>

**Expected Result:** Password is updated. User can log in with new password. Old password no longer works.

---


## Two-Factor Authentication

### AU-012 — Enable 2FA from profile (if available)

**Module:** Two-Factor Authentication | **Priority:** Medium

**Pre-conditions:** Logged in. 2FA feature deployed.

**Steps:**
1. Navigate to Profile or Settings.
2. Locate Two-Factor Authentication section.
3. Click Enable.
4. Scan QR code with authenticator app.
5. Enter the 6-digit code shown by app.
6. Confirm.

**Test Data:** _(none)_

**Expected Result:** 2FA enabled successfully. Recovery codes are displayed and can be downloaded.

---


## Logout

### AU-013 — Log Out from sidebar ends session

**Module:** Logout | **Priority:** High

**Pre-conditions:** Logged in as any role.

**Steps:**
1. Click 'Log Out' in left sidebar.
2. After redirect, click browser Back button.

**Test Data:** _(none)_

**Expected Result:** User is redirected to login page. Browser Back does NOT return to the dashboard — login page is shown again or session is gone.

---


## Authorization

### AU-014 — Client URL not accessible to Peer (and vice versa)

**Module:** Authorization | **Priority:** Critical

**Pre-conditions:** Logged in as Peer/Reviewer.

**Steps:**
1. Note the URL of a Client-only page (e.g., /upload-file) from a Client session.
2. While logged in as Peer, paste that URL into the address bar.
3. Press Enter.

**Test Data:** _(none)_

**Expected Result:** Peer is blocked — either redirected to their own dashboard, shown 403 Forbidden, or 404 Not Found. The Client-only page MUST NOT render.

---

### AU-015 — Peer URL not accessible to Client

**Module:** Authorization | **Priority:** Critical

**Pre-conditions:** Logged in as Client.

**Steps:**
1. Try to navigate to a Super Admin route (e.g., /peers, /companies) by typing in the URL.

**Test Data:** _(none)_

**Expected Result:** Client is blocked from accessing Super Admin routes (403/404 or redirect to client dashboard).

---

## Cross-Cutting UX Rules (NEW)

### AU-016 — CANONICAL RULE: every numeric widget on every dashboard drills into its contributing items

**Module:** Cross-Cutting UX | **Priority:** High

**Pre-conditions:** Logged in as any persona (Super Admin, Client, Peer/Reviewer, Credentialer). All four dashboards have numeric counters, status circles, or KPI tiles.

**Rule (confirmed May 2026):** Every numeric value displayed on a dashboard widget — counts, totals, percentages backed by counts, KPI numbers — must be **clickable** and navigate to a drill-down page showing the exact records that contribute to that number. The drill-down record count must equal the dashboard number (no off-by-one, no silent filter mismatch).

**Steps:**
1. **Super Admin Dashboard:** click each numeric widget — Unassigned, In Progress, Past Due (per SA-002), and any newly added widgets (Suggested, Returned by Peer, etc., from SA-067A..H).
2. **Client Dashboard:** click each numeric widget — Past Due, In Progress, Total Reviews, Score % (per CL-038), Tabs (All / Complete / Incomplete).
3. **Peer/Reviewer Dashboard:** click each numeric status circle — Completed / In-Progress / Incomplete (per PR-002).
4. **Credentialer Dashboard:** click each bucket counter — newly added, expiring soon, expired (per CR-003).
5. For each drill-down page reached:
   - Verify the result count exactly matches the dashboard number.
   - Verify the records shown actually match the widget's filter criteria (e.g., "Past Due = 8" → 8 cases shown, all actually past due).
   - Verify column structure includes the records' identifying fields (case / peer / chart / etc.) so user can act on what they see.
6. Test edge cases:
   - Widget showing **0** — clicking should still navigate to the drill-down with an empty-state message ("No items"), not throw an error or do nothing.
   - Widget reflecting a **percentage** (e.g., 92% on Specialty Highlights) — clicking should drill into the underlying count of reviews / cases that produced the percentage, with both numerator and denominator visible.

**Expected Result:**
- Every numeric widget across all four dashboards is clickable and produces a drill-down page.
- Drill-down record count matches the widget number exactly.
- 0-count widgets navigate to a clean empty state, not a dead click.
- Percentage widgets drill into the underlying counted records (numerator/denominator visible).
- This is a **platform-wide UX rule**, not a per-screen feature — any future dashboard widget added must comply.

**Notes:** NEW REQUIREMENT — confirmed with Ashton (May 2026): every dashboard number drills into its contributors. SA-002, CL-038, CR-003/CR-004, and PR-002 are the per-persona instances; this is the canonical platform rule that applies to current and future widgets. If a new dashboard widget ships without drill-down, log a bug.

---
