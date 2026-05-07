# Review Case Status — State Diagram & Operations Matrix

## Status Flow

```
                    ┌──────────────┐
                    │  UNASSIGNED  │ ← Case created during batch upload
                    └──┬───────┬──┘
                       │       │
            [AI suggests]   [Admin manually assigns]
                       │       │
                       v       │
                ┌──────────────┐│
                │PENDING       ││
                │APPROVAL      ││
                └──┬────────┬──┘│
                   │        │   │
             [Approve]  [Reject]│
                   │        │   │
                   │    UNASSIGNED
                   │        │
                   v        │
                ┌──────────┐◄──┘
                │ ASSIGNED │ ← Peer confirmed, 7-day due date set
                └──┬───────┘
                   │
            [Peer opens review]
                   │
                   v
             ┌─────────────┐
             │ IN PROGRESS │ ← Peer started working on the review
             └──┬──────┬───┘
                │      │
       [Peer    │      │  [Due date passes]
       submits] │      │  (daily cron)
                │      │
                v      v
         ┌──────────┐  ┌──────────┐
         │COMPLETED │  │ PAST DUE │
         └──────────┘  └────┬─────┘
                            │
                     [Peer can still submit]
                            │
                            v
                      ┌──────────┐
                      │COMPLETED │
                      └──────────┘

    From ASSIGNED, IN_PROGRESS, or PAST_DUE:
         │
    [Peer returns case]
         │
         v
    ┌────────────────┐
    │RETURNED BY PEER│ ← Peer returned with reason, needs reassignment
    └────────────────┘

    From any non-completed status:
         │
    [Admin unassigns]
         │
         v
    ┌──────────────┐
    │  UNASSIGNED  │
    └──────────────┘
```

## Status Descriptions

| Status | Description |
|---|---|
| **Unassigned** | Case created but no peer assigned. Awaiting AI suggestion or manual assignment. |
| **Pending Approval** | AI suggested a peer match. Admin must approve, reject, or reassign before the peer can start. |
| **Assigned** | Admin approved the assignment (or manually assigned). Peer can now review the chart. 7-day due date countdown begins. |
| **In Progress** | Peer opened the review form and started working. Set automatically when peer loads the split-screen page. |
| **Completed** | Peer submitted the review. Score computed. Case is immutable — cannot be reassigned or unassigned. |
| **Past Due** | Due date passed without completion. Peer can still submit. Admin can reassign or unassign. |
| **Returned by Peer** | Peer returned the case with a reason (min 10 characters). Peer cleared. Needs admin reassignment. |

## Transition Triggers

| From | To | Trigger | Who |
|---|---|---|---|
| _(new)_ | Unassigned | Batch upload creates case | System |
| Unassigned | Pending Approval | AI suggests a peer | System (auto-suggest) |
| Unassigned | Assigned | Admin manually assigns via peer picker | Admin |
| Pending Approval | Assigned | Admin approves | Admin |
| Pending Approval | Unassigned | Admin rejects AI suggestion | Admin |
| Assigned | In Progress | Peer opens the review (split-screen page loads) | System (auto) |
| Assigned | Past Due | Due date passes (daily cron) | System |
| Assigned | Returned by Peer | Peer returns case with reason | Peer |
| Assigned | Unassigned | Admin unassigns | Admin |
| Assigned | Assigned | Admin reassigns to different peer | Admin |
| In Progress | Completed | Peer submits review | Peer |
| In Progress | Past Due | Due date passes (daily cron) | System |
| In Progress | Returned by Peer | Peer returns case with reason | Peer |
| In Progress | Unassigned | Admin unassigns | Admin |
| In Progress | Assigned | Admin reassigns to different peer | Admin |
| Past Due | Completed | Peer submits review (still allowed) | Peer |
| Past Due | Unassigned | Admin unassigns | Admin |
| Past Due | Assigned | Admin reassigns | Admin |
| Past Due | Returned by Peer | Peer returns case | Peer |
| Returned by Peer | Pending Approval | AI re-suggests | System |
| Returned by Peer | Assigned | Admin manually reassigns | Admin |

## Operations Matrix by Status

| Operation | Unassigned | Pending Approval | Assigned | In Progress | Completed | Past Due | Returned by Peer |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Assign (manual)** | Y | - | - | - | - | - | - |
| **AI Suggest** | Y | - | - | - | - | - | Y |
| **Approve** | - | Y | - | - | - | - | - |
| **Reject** | - | Y | - | - | - | - | - |
| **Reassign** | - | Y | Y | Y | - | Y | Y |
| **Unassign** | - | Y | Y | Y | - | Y | - |
| **Peer Open (→ in_progress)** | - | - | Y | - | - | - | - |
| **Peer Submit Review** | - | - | Y | Y | - | Y | - |
| **Peer Return Case** | - | - | Y | Y | - | Y | - |
| **Peer Request Reassignment** | - | - | Y | Y | - | Y | - |
| **Flag Past Due (cron)** | - | - | Y | Y | - | - | - |
| **View Case Detail** | Y | Y | Y | Y | Y | Y | Y |

**Key rule**: Completed cases are **immutable** — no reassign, unassign, or re-review allowed (SA-070).

## What Happens at Each Transition

### Unassigned → Assigned (Admin Manual Assign)
- Admin clicks "Assign" button on unassigned case
- Peer picker modal opens, admin selects a peer
- Sets `peerId`, `assignedAt = now()`, `dueDate = now() + 7 days`
- Sets `assignmentSource = 'reassigned'`
- Status → `assigned`
- Syncs batch status (may transition batch to `in_progress`)

### Unassigned → Pending Approval (AI Suggest)
- AI analyzes case specialty, provider, and available peers
- Selects best-match peer based on specialty, capacity, workload
- Sets `peerId`, `assignmentSource = 'ai_suggested'`
- Status → `pending_approval`

### Pending Approval → Assigned (Approve)
- Sets `assignedAt = now()`
- Sets `dueDate = now() + 7 days`
- Increments `peer.activeCasesCount`
- Status → `assigned`
- Sends email notification to peer

### Pending Approval → Unassigned (Reject)
- Clears `peerId`
- Sets `assignmentSource = 'manual'`
- Status → `unassigned`

### Assigned → In Progress (Peer Opens Review)
- Peer opens the split-screen review page
- `PeerCaseSplit` component fires `useEffect` on mount
- Calls `POST /api/cases/{id}/start`
- Status → `in_progress` (idempotent — no-op if already in_progress or completed)
- Syncs batch status

### In Progress → Completed (Peer Submit) / Assigned → Completed (Peer Submit)
- Creates `reviewResult` row with scores, narrative, criteria
- Status → `completed`
- Decrements `peer.activeCasesCount`
- Increments `batch.completedCases`
- Extends chart retention by 30 days
- Triggers quality scoring + corrective action plan (if score < 70)

### Assigned → Past Due (Cron)
- Daily cron checks: `status IN ('assigned', 'in_progress') AND due_date < now()`
- Status → `past_due`
- No peer change — peer can still submit

### Assigned → Returned by Peer
- Peer provides reason (min 10 characters)
- Clears `peerId`
- Sets `returnedByPeerAt`, `returnedReason`
- Status → `returned_by_peer`

### Admin Reassign (from Unassigned/Assigned/In Progress/Past Due/Pending Approval)
- Validates target peer is `status = 'active'`
- Validates case is NOT `completed`
- Swaps `peerId` to new peer
- Sets `assignmentSource = 'reassigned'`
- Sets `assignedAt = now()`
- Status → `assigned`

### Admin Unassign
- Clears `peerId`
- Status → `unassigned`

## Due Date Mechanics

- Set to **now() + 7 days** when assignment is approved
- Checked by daily cron `/api/cron/flag-past-due`
- Cases past due can still be submitted by the peer
- Admin can reassign past-due cases to a different peer

## Peer Capacity Tracking

| Event | Effect on `peer.activeCasesCount` |
|---|---|
| Assignment approved | +1 |
| Peer submits review (completed) | -1 |
| Peer reassigned to different peer | -1 old peer, +1 new peer |
| Assignment rejected/unassigned | No change (was pending, not counted) |

**Capacity check**: `activeCasesCount < maxCaseLoad` (default 75). Enforced during AI suggestion and batch approve-all.

## Assignment Source Tracking

| Value | Meaning |
|---|---|
| `manual` | Admin manually assigned or case was reset after rejection |
| `ai_suggested` | AI suggested and admin approved |
| `reassigned` | Admin reassigned from assignments page |

## Reassignment Request Flow (Peer-Initiated)

Separate from admin reassignment — this is when a peer asks to be taken off a case:

1. Peer clicks "Request Reassignment" + provides reason
2. `caseReassignmentRequests` row created (status = `open`)
3. Case flagged: `reassignmentRequested = true`
4. Admin email notification sent
5. Admin resolves: approve (swap peer) or dismiss
6. `reassignmentRequested` cleared on case

**Note**: This does NOT change the case status. The case remains `assigned` while the request is pending.

## UI Actions by Status (Reviews Page & Batch Detail)

| Status | Actions Shown |
|---|---|
| Unassigned | Assign |
| Pending Approval | Approve, Reassign, Unassign |
| Assigned | Reassign, Unassign |
| In Progress | Reassign, Unassign |
| Completed | _(no actions — immutable)_ |
| Past Due | Reassign, Unassign |
| Returned by Peer | Reassign |

## Past Due — How It Works

The `past_due` status is set by a **daily cron job** (`/api/cron/flag-past-due`):

1. Runs daily (registered in vercel.json)
2. Queries: `status IN ('assigned', 'in_progress') AND due_date < now() AND due_date IS NOT NULL`
3. Updates matching cases: `status → 'past_due'`
4. The peer can still submit a review for a past_due case — it transitions to `completed` normally
5. Admin can also reassign or unassign past_due cases

**Due date is set to 7 days from approval** — so a case becomes past_due if the peer doesn't submit within a week.

## In Progress — Auto-Set When Peer Opens Review

The `in_progress` status is set automatically when a peer opens the split-screen review page. The `PeerCaseSplit` component fires a `useEffect` on mount that calls `POST /api/cases/{id}/start`, which transitions `assigned` → `in_progress`.

This is idempotent — calling it multiple times (e.g., peer refreshes the page) has no effect if the case is already `in_progress` or `completed`.

The peer portal counts both `assigned` and `in_progress` together as "In Progress" for display purposes. The cron job checks both statuses for past_due detection.

## Peer Portal — Case Visibility

Cases appear on a peer's dashboard based on their `peerId`:
- **In Progress**: Cases with `status = 'assigned'` where `peer_id = current peer`
- **Completed**: Cases with `status = 'completed'` where `peer_id = current peer`
- **Incomplete**: Should NOT show on peer's view — these are `unassigned`, `past_due`, or `pending_approval` cases that may not belong to the peer

**Note**: Unassigned cases have no `peerId` and should never appear on a peer's list. They only appear in the admin's Reviews page for assignment.

## Notes

1. **`in_progress` is auto-set** — transitions from `assigned` when the peer opens the review form. Peer portal groups `assigned` + `in_progress` together as "In Progress".
2. **`returned_by_peer` exists in DB** but is not in the CaseStatus TypeScript type. Should be added for type safety.
3. **Completed is terminal** — once a review is submitted, the case cannot be modified, reassigned, or unassigned.
4. **Past due doesn't block submission** — the peer can still submit after the due date. It's a warning flag, not a hard block.
5. **7-day due date** is set at approval time, not at AI suggestion time. Pending approval cases have no due date.
6. **Unassigned cases drop off peer's list** — when a case is unassigned (peerId cleared), it disappears from the peer's dashboard and goes back to the admin's unassigned queue.
