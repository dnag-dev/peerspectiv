# Phase 5: Assignments & Notifications

**Size: L** | **~25 test cases** | **Pre-requisites: Phases 2, 4**

## Goal
Verify the full assignment workflow: AI suggests assignments based on specialty/capacity/license, SA approves/overrides/rejects, batch splits across peers, peer self-unassigns, email notifications fire. This is the bridge between upload and peer review.

## Test Cases

| ID | What | Personas | Type |
|----|------|----------|------|
| SA-067 | Manual assign (baseline, no AI) | SA | Verify |
| SA-067A | AI auto-suggests (specialty + capacity + license) | SA | Verify |
| SA-067B | SA approves (single + bulk) | SA | Verify |
| SA-067C | SA overrides AI suggestion | SA | Verify |
| SA-067D | SA rejects suggestion -> manual queue | SA | Verify |
| SA-067E | Assignments index page (search, filter, drill-in) | SA | Verify |
| SA-067F | Reassign from assignments page | SA | Verify |
| SA-067G | Unassign a case | SA | Verify |
| SA-067H | SA reviews peer-returned cases with comment | SA, Peer | Verify |
| SA-067I | Batch splits across peers at capacity | SA | Verify |
| SA-069 | Bulk assign multiple batches | SA | Verify |
| SA-070 | Cannot reassign completed review | SA | Verify |
| SA-074 | Capacity respects Max Case Assignment | SA | Verify |
| SA-074A | Capacity edge cases (suggested excluded, completed frees, max lowered) | SA | Verify |
| SA-087 | Round-robin + workload balancing | SA | Verify |
| SA-089 | Approve All / Override before commit | SA | Verify |
| SA-091 | Email notification on assignment | SA, Peer | Verify |
| SA-092 | Auto-reminder past-due email | SA, Peer | Verify |
| PR-030 | Peer self-unassign with required reason | Peer, SA | Verify |
| PR-032 | Peer dashboard shows only matching specialties | Peer | Verify |

## Key Files
- `lib/assignment/auto-suggest.ts` — capacity-aware assignment engine
- `lib/ai/assignment-engine.ts` — AI suggestion logic
- `lib/peers/capacity.ts` — free slots = Max - load
- `app/(dashboard)/assignments/` — assignments index page
- `app/(dashboard)/assign/` — assignment workflow
- `app/api/assign/suggest/` + `approve/` — assignment API
- `app/api/peer/cases/[id]/return/` — peer self-unassign
- `lib/email/notifications.ts` — email functions
- `app/api/cron/past-due-reminders/` — past-due cron

## What Needs Work
- Verify all assignment flows end-to-end
- Verify capacity math with edge cases (SA-074A)
- Verify email notifications fire correctly

## Unlocks
Cases assigned to peers. Peer dashboards populated. Chain 4 midpoint.
