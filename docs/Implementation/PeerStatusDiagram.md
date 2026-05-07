# Peer Status — State Diagram & Operations Matrix

## Status Flow

```
                   ┌──────────┐
                   │ INVITED  │ ← Admin sends invite link
                   └────┬─────┘
                        │ Peer submits onboarding form
                        v
              ┌─────────────────────┐
              │ PENDING ADMIN REVIEW│ ← Admin reviews submission
              └────────┬────────────┘
                       │ Admin approves
                       v
              ┌─────────────────────┐
              │PENDING CREDENTIALING│ ← Also: direct add (Path B)
              └────────┬────────────┘   or self-serve form (Path C)
                       │
                       │ Credentialer verifies license
                       │ + marks credentialed
                       v
        ┌──────────[ ACTIVE ]──────────┐
        │              │               │
   [Admin suspends]    │         [License expires]
   (requires reason)   │         (automatic via cron)
        │              │               │
        v              │               v
   ┌────────────┐      │     ┌─────────────────┐
   │ SUSPENDED  │      │     │ LICENSE EXPIRED  │
   └─────┬──────┘      │     └────────┬────────┘
         │             │              │
    [Reinstate]        │      [Credentialer renews
    (requires reason)  │       license + new expiry]
         │             │              │
         └─────────────┴──────────────┘
                       │
               [Archive from any state]
               (requires reason, no active cases)
                       │
                       v
                ┌────────────┐
                │  ARCHIVED  │  ← Terminal state
                └────────────┘
```

## Status Descriptions

| Status | Description |
|---|---|
| **Invited** | Admin sent an invite link via email. Peer hasn't responded yet. |
| **Pending Admin Review** | Peer submitted the onboarding form. Admin needs to approve or reject. |
| **Pending Credentialing** | Admin approved. Credentialer needs to verify license and documents. |
| **Active** | Fully credentialed. Can be assigned review cases. |
| **License Expired** | License expiry date has passed. Auto-transitioned by daily cron. Blocked from assignments. |
| **Suspended** | Admin manually suspended (with documented reason). Blocked from assignments. |
| **Archived** | Permanently deactivated. Terminal state — no transitions out. |

## Onboarding Paths

### Path A: Admin Invite Link
```
Admin creates invite (/api/peers/invite)
  → Email sent with /onboard/{token} link
    → Peer fills form
      → Admin approves → Pending Credentialing
        → Credentialer verifies → Active
```

### Path B: Admin Direct Add
```
Admin adds peer via AddPeerModal (/api/peers POST)
  → Created as Pending Credentialing
    → Credentialer verifies → Active
```

### Path C: Self-Serve Form
```
Peer fills public form at /onboard (/api/onboard/peer POST)
  → Created as Pending Credentialing
    → Credentialer verifies → Active
```

## Transition Triggers

| From | To | Trigger | Requires Reason |
|---|---|---|---|
| Invited | Pending Admin Review | Peer submits onboarding form | No |
| Invited | Archived | Admin rejects | Yes |
| Pending Admin Review | Pending Credentialing | Admin approves | No |
| Pending Admin Review | Archived | Admin rejects | Yes |
| Pending Credentialing | Active | Credentialer marks credentialed | No |
| Pending Credentialing | Archived | Admin removes | Yes |
| Active | License Expired | Daily cron (license date passed) | No (automatic) |
| Active | Suspended | Admin suspends | Yes |
| Active | Archived | Admin archives | Yes |
| License Expired | Active | Credentialer renews license | No |
| License Expired | Archived | Admin archives | Yes |
| Suspended | Active | Admin reinstates | Yes |
| Suspended | Archived | Admin archives | Yes |
| Archived | _(none)_ | Terminal state | — |

## Operations Matrix by Status

| Operation | Invited | Pending Admin | Pending Cred. | Active | License Expired | Suspended | Archived |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Assign cases** | - | - | - | Y | - | - | - |
| **AI assignment suggestions** | - | - | - | Y | - | - | - |
| **Self-assign cases** | - | - | - | Y | - | - | - |
| **Submit reviews** | - | - | - | Y | - | - | - |
| **View peer profile** | Y | Y | Y | Y | Y | Y | Y |
| **Edit peer details** | Y | Y | Y | Y | Y | Y | - |
| **Edit specialties** | - | - | Y | Y | Y | Y | - |
| **Upload license doc** | - | - | Y | Y | Y | - | - |
| **Mark credentialed** | - | - | Y | - | - | - | - |
| **Renew license** | - | - | - | - | Y | - | - |
| **Suspend** | - | - | - | Y | - | - | - |
| **Reinstate** | - | - | - | - | - | Y | - |
| **Archive** | Y | Y | Y | Y* | Y | Y | - |

\* Active: Archive blocked if peer has assigned or in_progress cases. Must complete or reassign all cases first.

## Specialty Verification (per-specialty, independent of peer status)

Specialty verification is tracked separately from the peer's lifecycle status. Each peer can have multiple specialties, and each specialty has its own verification status.

### Verification Statuses

| Verified Status | Badge Color | Icon | Meaning |
|---|---|---|---|
| **Verified** | Green | Checkmark | Credentialer confirmed peer is qualified for this specialty |
| **Pending** | Amber | Clock | Specialty added but not yet verified by credentialer |
| **Not Verified** | Red | X | Credentialer reviewed and rejected this specialty |

### How It Works

1. **Specialties are added** when a peer is created (via onboarding form or admin) — they start as `pending`
2. **Credentialer reviews** each specialty at `/credentialing/peers/[id]` and sets verification status
3. **Peer can be marked Active** once the license is verified — specialty verification is independent
4. A peer with status `active` may still have some specialties `pending` or `not_verified`

### Relationship to Peer Status

| Scenario | Peer Status | Specialty Verification | Can Be Assigned? |
|---|---|---|---|
| License verified, all specialties verified | Active | All verified | Yes — any specialty |
| License verified, some specialties pending | Active | Mixed | Yes — cases should match verified specialties |
| License verified, no specialties verified | Active | All pending | Yes — but ideally wait for verification |
| License not yet verified | Pending Credentialing | Any | No — peer status blocks assignment |
| License expired | License Expired | Any | No — peer status blocks assignment |

### Assignment Engine Behavior

The AI assignment engine filters by:
1. **Peer status = active** (hard requirement)
2. **Specialty match** — peer must have the required specialty in `peer_specialties`
3. **Capacity** — `active_cases_count < max_case_load`

Note: The current assignment engine checks for specialty presence but does not filter by `verified_status`. This means a peer with a `pending` specialty could still receive assignments for that specialty if their status is `active`. Tightening this to require `verified` is a potential future enhancement.

### UI Display

**Peers List Table:**
- Specialty badges are color-coded by verification status (green/amber/red with icons)
- "Verification" filter: Any / All Verified / Has Unverified

**Credentialer Detail Page:**
- Each specialty shows current verification status
- Credentialer can change status to verified/not_verified/pending

## License Expiry Automation

### Daily Cron Job (`/api/cron/license-expiry` — runs 6am UTC)

**Pre-expiry warnings** (sent to credentialing inbox):
| Days Before Expiry | Action |
|---|---|
| 14 days | Email: "License expires in 14 days: {Peer Name}" |
| 7 days | Email: "License expires in 7 days: {Peer Name}" |
| 3 days | Email: "License expires in 3 days: {Peer Name}" |
| 1 day | Email: "License expires in 1 day: {Peer Name}" |

**On expiry (day 0)**:
1. Transitions peer: `active` → `license_expired`
2. Finds all assigned/in_progress cases for that peer
3. Attempts auto-reassignment to another active peer with:
   - Matching specialty
   - Available capacity (active_cases < max_case_load)
   - Lowest current workload preferred
4. Cases that can't be reassigned: peer_id cleared, flagged "Needs Reassignment"
5. Sends summary email to admin with counts

**Deduplication**: Each notification is logged in `license_notification_log` to prevent duplicate emails on repeated cron runs.

## UI Elements by Status

### Peer Detail Page Buttons

| Status | Available Actions |
|---|---|
| Invited | Archive |
| Pending Admin Review | Archive |
| Pending Credentialing | Archive |
| Active | Suspend, Archive |
| License Expired | Archive |
| Suspended | Reinstate, Archive |
| Archived | _(no actions)_ |

All destructive actions (Suspend, Archive) require a confirmation dialog with a reason field.

### Status Badge Colors

| Status | Badge Color |
|---|---|
| Invited | Blue |
| Pending Admin Review | Amber |
| Pending Credentialing | Blue |
| Active | Green |
| License Expired | Red |
| Suspended | Red |
| Archived | Gray |

### Peers List Table Columns

| Column | Description |
|---|---|
| Name | Clickable link to peer detail page |
| Status | Lifecycle status badge (active, suspended, etc.) |
| Email | Peer email address |
| Specialties | Badges with verification icons (checkmark=verified, clock=pending, X=rejected) |
| License | License number + expiry date (warns if < 60 days) |
| License State | US state of license (TX, CA, etc.) |
| Active | Current active case count |
| Total | Total reviews completed |
| Availability | Available/Vacation/On Leave badge + rate |
| Actions | Edit, Set Unavailable/Mark Available |

### Peers List Filters

| Filter | Options | Default |
|---|---|---|
| Search | Free text (name, email, specialty) | — |
| Status | All / Active / Invited / Pending Admin Review / Pending Credentialing / License Expired / Suspended / Archived | Active |
| Specialty | All / (from taxonomy) | All |
| Verification | Any / All Verified / Has Unverified | Any |
| Availability | Any / Available / Vacation / On Leave / Inactive | Any |
| License State | Any / (US state codes) | Any |

## Case Assignment Guards

Only **Active** peers can receive case assignments. Enforced at:

1. **AI assignment engine** — filters to `status='active'` peers only
2. **Manual assignment approval** — blocks if peer not in active status
3. **Auto-reassignment on license expiry** — picks from active peers only
4. **Capacity check** — `active_cases_count < max_case_load` (default 75)

## Credentialer Workflow

The Credentialer persona manages peer credentials from `/credentialing`:

### Inbox (`/credentialing/inbox`)
- Shows peers in `pending_credentialing` status
- Click to open credential review

### Peer Detail (`/credentialing/peers/[id]`)
- **Specialties section**: Add/remove, set verification status (pending/verified/not_verified)
- **License section**: Update license number, state, document URL, expiry date
- **Mark Credentialed button**: Requires license document on file. Transitions peer to Active.
- **Save License button**: Updates metadata without status change (or renews license_expired → active)
- **Audit log**: Shows all credentialing actions with timestamps

### Credentialing vs Specialty Verification

| What | Scope | Who Does It | Effect on Status |
|---|---|---|---|
| **Credentialing** (Mark Credentialed) | Peer-level | Credentialer | Transitions pending_credentialing → active |
| **Specialty Verification** | Per-specialty | Credentialer | Updates verified_status on peer_specialties row. No status change. |
| **License Renewal** | Peer-level | Credentialer | Transitions license_expired → active |

## Audit Trail

Three audit mechanisms track peer changes:

| Table | What's Logged | Written By |
|---|---|---|
| `peer_state_audit` | from_status, to_status, changed_by, reason | `transitionPeer()` function |
| `audit_logs` | action, resource_type, resource_id, metadata | All status transitions + cron |
| `peer_credentialing_log` | action, valid_until changes, document_url, notes | Credentialing endpoints |

Visible at:
- **Admin**: `/peers/{id}` → Status History section
- **Credentialer**: `/credentialing/peers/{id}` → Audit Log card

## Notes

1. **License is per-peer, not per-specialty**: One medical license covers all specialties a peer reviews. Specialties are tracked separately in the `peer_specialties` table.
2. **Specialty verification is independent of peer status**: A peer can be Active with unverified specialties. Verification is informational — the assignment engine currently doesn't enforce it (potential enhancement).
3. **Availability vs Status**: `availability_status` (available/vacation/on_leave) is separate from the lifecycle `status`. A peer can be Active but on vacation — they won't receive new assignments but their status doesn't change.
4. **Max case load**: Default 75 cases. Configurable per peer. Enforced during assignment, not during status transitions.
5. **Archived is terminal**: No way back from archived. If a peer needs to return, create a new record.
6. **Email notifications**: Require `CREDENTIALING_EMAIL` and `ADMIN_EMAIL` env vars. Falls back to `admin@peerspectiv.com` in demo mode.
7. **Column naming**: Peers use `status` for lifecycle (consistent with companies table). The legacy `state` column has been removed.
