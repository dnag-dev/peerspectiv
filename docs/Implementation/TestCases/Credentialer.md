# Credentialer — Test Cases

> Persona: Third-party credentialing professional contracted by Peerspectiv. Verifies reviewer licenses (DEA, board cert, sanctions checks). Has limited access — only the Credentialing dashboard and peer-credentialing actions. Tests assume Super Admin has added at least 1 new (uncredentialed) peer.

---


## Authorization & Access

### CR-001 — Credentialer login lands on Credentialing dashboard

**Module:** Authorization | **Priority:** High

**Pre-conditions:** A user account is configured with role = Credentialer.

**Steps:**
1. Log in with credentialer account.
2. Observe landing page.

**Test Data:** _(none)_

**Expected Result:** After login, credentialer lands on the Credentialing dashboard. Sidebar shows credentialing-specific navigation only.

---

### CR-002 — Credentialer cannot access Super Admin pages

**Module:** Authorization | **Priority:** High

**Pre-conditions:** Logged in as Credentialer.

**Steps:**
1. Try to navigate directly via URL to: /admin/companies, /admin/invoices, /admin/forms, /admin/settings.
2. Try to access another peer's assignment list.

**Test Data:** _(none)_

**Expected Result:** Each forbidden URL returns 403 / redirect to credentialing dashboard / "Not authorized" page. No data leakage.

---


## Credentialing Dashboard

### CR-003 — Dashboard shows three buckets with counts, each clickable

**Module:** Credentialing Dashboard | **Priority:** High

**Pre-conditions:** System has at least 1 peer in each bucket.

**Steps:**
1. Open Credentialing dashboard.
2. Inspect the three sections — each should show a bucket name AND a numeric count.
3. Click the count number on the Newly Added bucket.
4. Repeat for Expiring Soon and Expired buckets.

**Test Data:** _(none)_

**Expected Result:** Three distinct bucket lists visible: (a) Newly added — needs initial credentialing; (b) Expiring soon — within 14/7/3/1 days of Valid Until (per SA-123 cadence); (c) Expired — past Valid Until. Each bucket displays a numeric count. Clicking the count navigates to a drill-down list of the peers in that bucket. Drill-down count matches the bucket number exactly. Per the platform rule (AU-016).

**Notes:** Updated May 2026 — bucket cadence aligned with SA-123 (14/7/3/1) and drill-down rule formalized per AU-016.

---

### CR-004 — Drill into a peer from any dashboard bucket

**Module:** Credentialing Dashboard | **Priority:** Medium

**Pre-conditions:** At least 1 peer in any bucket.

**Steps:**
1. Click a peer name in the Newly Added bucket.
2. Observe.

**Test Data:** _(none)_

**Expected Result:** Peer profile (credentialing view) opens. Shows: name, email, license #, license state, license file (if uploaded), specialty, NPI, current status, Valid Until date.

---


## Credentialing a New Peer

### CR-005 — New Peer defaults to Pending Credentialing (per state machine)

**Module:** New Peer | **Priority:** High

**Pre-conditions:** Logged in as Super Admin in another tab.

**Steps:**
1. As Super Admin, add a new Peer (via SA-022 manual, SA-075 AI form, or SA-031C self-onboarding approval — all three paths land here).
2. As Credentialer (other tab), refresh dashboard.
3. Inspect new peer's state.

**Test Data:** _(none)_

**Expected Result:** New peer appears in the "Newly Added — needs initial credentialing" bucket. State = **Pending Credentialing** (replaces older "Inactive / Not Credentialed" wording — see SA-022B for the full state machine).

**Notes:** Naming aligned May 2026 — same state, clearer name.

---

### CR-006 — Non-Active peer cannot be assigned cases

**Module:** New Peer | **Priority:** High

**Pre-conditions:** A peer is in any non-Active state (Pending Credentialing, Invited, Pending Admin Review, License Expired, Suspended, or Archived).

**Steps:**
1. As Super Admin, attempt to assign cases to that peer (Assignments page, both manual SA-067 and AI-suggest SA-067A).
2. Observe selector or save behavior.

**Test Data:** _(none)_

**Expected Result:** Peer is filtered out of the assignment selector dropdown. Direct-ID assignment (URL / API) returns a clear error: "Peer not in Active state. Cannot assign." Save is blocked. Same enforcement applies to all six non-Active states.

**Notes:** Generalized May 2026 — was specific to "Inactive / Not Credentialed", now covers the full state machine (SA-022B / SA-031F).

---

### CR-007 — Upload license file and supporting documents during credentialing

**Module:** New Peer | **Priority:** High

**Pre-conditions:** A new peer needs credentialing.

**Steps:**
1. Open peer's credentialing profile.
2. Upload a license file (PDF).
3. Add credentialing notes (e.g., "DEA verified, sanctions check clean, board cert confirmed").
4. Save.

**Test Data:** _(none)_

**Expected Result:** License file uploaded and visible. Notes saved. Documents and notes auditable later.

---

### CR-008 — Set Credential Valid Until date and mark peer Credentialed

**Module:** New Peer | **Priority:** High

**Pre-conditions:** License and notes uploaded for a peer.

**Steps:**
1. Set Credential Valid Until = 1 year from today.
2. Click "Mark as Credentialed".
3. Save.
4. Refresh and re-check status.

**Test Data:** _(none)_

**Expected Result:** Status flips to Active / Credentialed. Valid Until date persisted on profile. Peer disappears from "Newly Added" bucket.

---


## Expiry Lifecycle

### CR-009 — Expired Valid Until automatically deactivates peer

**Module:** Expiry Lifecycle | **Priority:** High

**Pre-conditions:** Peer has Valid Until set to yesterday.

**Steps:**
1. Wait for / simulate the daily expiry sweep.
2. As Credentialer, refresh dashboard.
3. As Super Admin, try to assign new cases to that peer.

**Test Data:** _(none)_

**Expected Result:** Peer status flips to Inactive / Not Credentialed automatically. Peer appears in "Expired" bucket. New assignment blocked. (In-progress assignments handled per separate policy decision.)

---

### CR-010 — _SUPERSEDED by CR-018_

**Module:** Expiry Lifecycle | **Priority:** —

**Pre-conditions:** —

**Steps:** Originally tested 60/30/14-day expiry warnings. Confirmed cadence with Ashton (May 2026, revised): **14 / 7 / 3 / 1 days + post-expiry**. Use CR-018 for the corrected coverage.

**Test Data:** _(none)_

**Expected Result:** _Test superseded — do not run._

**Notes:** SUPERSEDED — kept as a placeholder so test IDs don't shift.

---

### CR-011 — Optional courtesy email to Peer themselves before expiry

**Module:** Expiry Lifecycle | **Priority:** Low

**Pre-conditions:** Per-feature toggle ON. Peer Valid Until approaching.

**Steps:**
1. Wait for / simulate notification trigger.
2. Check Peer's inbox.

**Test Data:** _(none)_

**Expected Result:** Peer receives a courtesy email asking them to upload an updated license. Includes link to upload portal. Toggle can be set OFF to suppress.

---

### CR-012 — _SUPERSEDED by CR-017_

**Module:** Expiry Lifecycle | **Priority:** —

**Pre-conditions:** —

**Steps:** Originally tested re-credentialing of an expired peer. Superseded May 2026 by CR-017, which now covers both starting states (License Expired → Active reactivation, AND Active → Active no-op early renewal).

**Test Data:** _(none)_

**Expected Result:** _Test superseded — do not run. Use CR-017 for the canonical coverage._

**Notes:** SUPERSEDED — kept as a placeholder so test IDs don't shift.

---


## Credentialer Earnings (cross-ref with NR-007/NR-008)

### CR-013 — Credentialer monthly earnings ($100 per peer DEFAULT, but configurable)

**Module:** Earnings | **Priority:** Medium

**Pre-conditions:** Logged in as Credentialer. At least 5 peers credentialed this month. Credentialer's per-peer rate set to default $100.

**Steps:**
1. Open Earnings tab on credentialing dashboard.
2. Inspect totals.
3. Compare to the count of peers credentialed × the configured rate.

**Test Data:** 5 peers credentialed × $100 = $500 expected.

**Expected Result:** Monthly total = $500 (count × rate). List of credentialed peers visible. Matches what Super Admin will pay. If rate has been overridden for this credentialer (see CR-020), totals reflect the override.

**Notes:** Confirmed with Ashton (May 2026): $100 is the **default** flat rate today, but the new app needs the option to modify the rate per credentialer (see CR-020). Cross-ref NR-007 / NR-008.

---

### CR-020 — Credentialer per-peer rate is CONFIGURABLE per credentialer

**Module:** Earnings | **Priority:** High

**Pre-conditions:** Logged in as Super Admin. At least 2 credentialer accounts exist.

**Steps:**
1. Super Admin > Settings > Credentialers (or Credentialer profile > Edit).
2. Locate "Per-Peer Rate" field on credentialer record.
3. For Credentialer A: leave at default $100.
4. For Credentialer B: change rate to $125. Save.
5. Login as Credentialer B and view earnings tab.
6. Credential 3 peers as Credentialer B during the test month.
7. Compare earnings total to expected.

**Test Data:** Credentialer B rate $125; 3 peers credentialed = $375 expected.

**Expected Result:**
- Per-peer rate field exists on each credentialer's record. Default value $100. Editable by Super Admin only.
- Numeric validation: positive number only; rejects negative, zero, and non-numeric.
- Credentialer B sees own rate reflected in own earnings tab; cannot edit own rate.
- Earnings calculation uses the credentialer's specific rate, not the global default.
- Rate change is forward-looking only: peers credentialed before the change retain the old rate; peers credentialed after, use the new rate. Audit log captures rate-change history.
- Both rates can coexist — Credentialer A still earns $100/peer concurrently.

**Notes:** NEW REQUIREMENT — confirmed with Ashton (May 2026): $100 is default, but rate must be modifiable per credentialer.

---


## —— NEW REQUIREMENTS (May 2026 — user feedback) ——

## Specialty Verification (NEW)

### CR-014 — Credentialer can VIEW and VERIFY specialties on peer credentialing record

**Module:** New Peer | **Priority:** High

**Pre-conditions:** Peer added by Super Admin with multiple specialties assigned (SA-101).

**Steps:**
1. Login as credentialer.
2. Open peer's credentialing record.
3. Locate Specialties section.
4. Cross-reference against board certification documents uploaded.
5. Mark each specialty as Verified (or flag a discrepancy).

**Expected Result:** All assigned specialties shown. Each can be individually marked Verified / Not Verified / Pending. Discrepancy creates a flag visible to Super Admin.

**Notes:** NEW REQUIREMENT.

---

### CR-015 — Credentialer can EDIT (add/remove) peer's specialties

**Module:** New Peer | **Priority:** Medium

**Pre-conditions:** CR-014 done.

**Steps:**
1. Open peer credentialing record.
2. Edit Specialties — add a new one verified by board cert; remove an unverified one.
3. Save.
4. Login as Super Admin and re-open the same peer's profile.

**Expected Result:** Credentialer's edits persist and are visible to Super Admin. Audit log records who changed what.

**Notes:** NEW REQUIREMENT.

---

## License Validity (NEW — paired with SA-116..SA-126)

### CR-016 — Credentialer can VIEW peer's license number, state, issue date, expiry date

**Module:** New Peer | **Priority:** Critical

**Pre-conditions:** Super Admin populated license info (SA-116, SA-117).

**Steps:**
1. Login as credentialer.
2. Open peer credentialing record.
3. Locate License section.

**Expected Result:** All license metadata visible. Document downloadable. Same values shown in SA view.

**Notes:** NEW REQUIREMENT.

---

### CR-017 — Credentialer updates license expiry: state behavior depends on starting state

**Module:** New Peer | **Priority:** Critical

**Pre-conditions:** Two test peers:
- **Peer A (License Expired):** state = License Expired (license expired 5 days ago, was previously Active, lost assignability per SA-122).
- **Peer B (Active, early renewal):** state = Active, license expires in 30 days, peer is assignable now.

**Steps:**

**Scenario 1 — Renewal of an EXPIRED peer (state changes):**
1. Login as Credentialer.
2. Open Peer A's credentialing record.
3. Update License Expiry Date to a future date (e.g., today + 2 years).
4. Upload renewed license PDF.
5. Save.
6. Verify Peer A's state immediately transitions: **License Expired → Active** (per SA-031H).
7. Switch to SA in another tab — try to assign a case to Peer A.
8. Verify Peer A appears in assignment selectors again.
9. Inspect audit log on Peer A.

**Scenario 2 — Early renewal of an ACTIVE peer (no state change):**
1. Open Peer B's credentialing record.
2. Update License Expiry Date to a future date (e.g., today + 2 years — pushing the existing 30-day-out expiry further out).
3. Upload renewed license PDF.
4. Save.
5. Verify Peer B's state stays **Active** — no state transition, since Peer B was never inactivated.
6. Verify Peer B's assignability is unchanged (was assignable before, still assignable after).
7. Inspect audit log on Peer B.
8. Verify any "expires in N days" warning badges that were showing on Peer B (e.g., the 14-day badge per SA-123) clear once the new expiry date is far enough out.

**Test Data:** Peer A expiry = today − 5 days, renewing to today + 2 years. Peer B expiry = today + 30 days, renewing to today + 2 years.

**Expected Result:**
- **Scenario 1:** Peer A transitions License Expired → Active. Reappears in assignment selectors immediately. Audit log captures the credentialer who acted, timestamp, old expiry, new expiry, and the state transition.
- **Scenario 2:** Peer B stays Active throughout — no state machinery triggers because the peer was never in a non-Active state. The license expiry date and document are updated; everything else continues normally. Pre-expiry warning badges (per SA-123 cadence: 14/7/3/1) clear because the new expiry is out of warning range. Audit log records the expiry-date update without any state transition.
- Both scenarios sync to the SA view (per SA-125).

**Notes:** Confirmed with Ashton (May 2026): Credentialer is responsible for updating new license validity. If the peer was previously inactivated due to expiry, the update reactivates them automatically (Scenario 1). If the peer is already Active, the update is a metadata change only — no state machinery runs (Scenario 2). Replaces SA-124 (which only covered Scenario 1) and CR-012 (which was Scenario 1 expressed loosely).

---

### CR-018 — License expiry NOTIFICATIONS fire at 14 / 7 / 3 / 1 days + post-expiry

**Module:** Expiry Lifecycle | **Priority:** High

**Pre-conditions:** Test SMTP. Peers with expiry at 13, 6, 2, 0 days and 1 day past expiry.

**Steps:**
1. Trigger notification cycle (or wait for cron).
2. Inspect credentialer's inbox.
3. Inspect dashboard alerts / "Expiring soon" counters.
4. Confirm post-expiry notification fires once on day-zero / day-after.

**Expected Result:** One email per threshold per peer (not duplicated across days). Four pre-expiry thresholds (14, 7, 3, 1) plus one post-expiry notification. Dashboard counter "Expiring soon" matches actual count.

**Notes:** Cadence simplified May 2026 to **14 / 7 / 3 / 1 + post-expiry** (replaces earlier 60/30/15/7/3/1 plan). Pairs with SA-123 on the SA side, which also covers auto-reassignment of in-progress cases when a peer's license expires.

---

### CR-019 — License document REQUIRED before peer can be marked Credentialed

**Module:** New Peer | **Priority:** High

**Pre-conditions:** New peer with no license document uploaded.

**Steps:**
1. Try to mark peer Credentialed.

**Expected Result:** Blocked with message "License document required." Once uploaded (CR-007), credentialing succeeds.

**Notes:** NEW REQUIREMENT.

---
