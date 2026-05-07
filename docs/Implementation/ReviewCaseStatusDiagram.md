# Review Case Status — State Diagram & Operations Matrix

## Status Flow

```
                    ┌──────────────┐
                    │  UNASSIGNED  │ ← Case created during batch upload
                    └──────┬───────┘
                           │
                    [AI suggests peer]
                           │
                    ┌──────v──────────┐
                    │PENDING APPROVAL │ ← AI suggested a peer, admin must approve
                    └──┬──────────┬───┘
                       │          │
                 [Approve]    [Reject]
                       │          │
                       v          └──→ UNASSIGNED (peer cleared)
                 ┌───────────┐
                 │  ASSIGNED  │ ← Peer confirmed, 7-day due date set
                 └──┬─────┬──┘
                    │     │
           [Peer    │     │  [Due date passes]
           submits] │     │  (daily cron)
                    │     │
                    v     v
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

    From ASSIGNED or PAST_DUE:
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
| **Assigned** | Admin approved the assignment. Peer can now review the chart. 7-day due date countdown begins. |
| **In Progress** | Peer is actively working on the review. (Semantic status — not explicitly set in DB, inferred from workflow.) |
| **Completed** | Peer submitted the review. Score computed. Case is immutable — cannot be reassigned or unassigned. |
| **Past Due** | Due date passed without completion. Peer can still submit. Admin can reassign or unassign. |
| **Returned by Peer** | Peer returned the case with a reason (min 10 characters). Peer cleared. Needs admin reassignment. |

## Transition Triggers

| From | To | Trigger | Who |
|---|---|---|---|
| _(new)_ | Unassigned | Batch upload creates case | System |
| Unassigned | Pending Approval | AI suggests a peer | System (auto-suggest) |
| Pending Approval | Assigned | Admin approves | Admin |
| Pending Approval | Unassigned | Admin rejects AI suggestion | Admin |
| Assigned | Completed | Peer submits review | Peer |
| Assigned | Past Due | Due date passes (daily cron) | System |
| Assigned | Returned by Peer | Peer returns case with reason | Peer |
| Assigned | Unassigned | Admin unassigns | Admin |
| Assigned | Assigned | Admin reassigns to different peer | Admin |
| Past Due | Completed | Peer submits review (still allowed) | Peer |
| Past Due | Unassigned | Admin unassigns | Admin |
| Past Due | Assigned | Admin reassigns | Admin |
| Past Due | Returned by Peer | Peer returns case | Peer |
| Returned by Peer | Pending Approval | AI re-suggests | System |
| Returned by Peer | Assigned | Admin manually reassigns | Admin |

## Operations Matrix by Status

| Operation | Unassigned | Pending Approval | Assigned | Completed | Past Due | Returned by Peer |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **AI Suggest** | Y | - | - | - | - | Y |
| **Approve** | - | Y | - | - | - | - |
| **Reject** | - | Y | - | - | - | - |
| **Reassign** | - | Y | Y | - | Y | Y |
| **Unassign** | - | Y | Y | - | Y | - |
| **Peer Submit Review** | - | - | Y | - | Y | - |
| **Peer Return Case** | - | - | Y | - | Y | - |
| **Peer Request Reassignment** | - | - | Y | - | Y | - |
| **Flag Past Due (cron)** | - | - | Y | - | - | - |
| **View Case Detail** | Y | Y | Y | Y | Y | Y |

**Key rule**: Completed cases are **immutable** — no reassign, unassign, or re-review allowed (SA-070).

## What Happens at Each Transition

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

### Assigned → Completed (Peer Submit)
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

### Admin Reassign (from Assigned/Past Due/Pending Approval)
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

## UI Actions by Status (Reviews Page)

| Status | Actions Shown |
|---|---|
| Unassigned | _(no actions — needs AI suggest first)_ |
| Pending Approval | Approve, Reassign, Unassign |
| Assigned | Reassign, Unassign |
| Completed | _(no actions — immutable)_ |
| Past Due | Reassign, Unassign |
| Returned by Peer | Reassign |

## Notes

1. **`in_progress` is semantic only** — defined in the CaseStatus type but never explicitly set in code. It's used in cron queries alongside `assigned` but the DB value stays `assigned`.
2. **`returned_by_peer` exists in DB** but is not in the CaseStatus TypeScript type. Should be added for type safety.
3. **Completed is terminal** — once a review is submitted, the case cannot be modified, reassigned, or unassigned.
4. **Past due doesn't block submission** — the peer can still submit after the due date. It's a warning flag, not a hard block.
5. **7-day due date** is set at approval time, not at AI suggestion time. Pending approval cases have no due date.
