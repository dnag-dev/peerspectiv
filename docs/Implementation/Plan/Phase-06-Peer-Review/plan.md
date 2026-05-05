# Phase 6: Peer Review Experience

**Size: XL** | **~35 test cases** | **Pre-requisites: Phases 3, 5**

## Goal
Deliver the complete peer review experience: dashboard with status circles, split-screen review with PDF viewer, form filling with per-question option sets, MRN workflow, attestation block, save/exit, submit with score computation, and completed review locking. This is the core operational workflow of the platform.

## Test Cases

| ID | What | Type |
|----|------|------|
| PR-001 | Peer dashboard loads with status circles | Verify |
| PR-002 | Status circle counts match + drill-down works | Verify |
| PR-003 | Tab filters review list | Verify |
| PR-004 | Color-coded status badges | Verify |
| PR-005 | Pagination across many assignments | Verify |
| PR-006 | Open review in split-screen | Verify |
| PR-007 | PDF viewer renders medical record | Verify |
| PR-008 | Answer Yes/No/NA for all questions | Verify |
| PR-009 | Final "Complies with Standards" question | Verify |
| PR-010 | Comments and Recommendations field | Verify |
| PR-011 | Reviewer name and license number field | Verify |
| PR-012 | Submit computes score correctly | Verify |
| PR-013 | Submit blocked if required fields empty | Verify |
| PR-014 | Save & Exit preserves work | Verify |
| PR-015 | Review duration tracked | Verify |
| PR-016 | Completed review locked from edit | Verify |
| PR-018 | Peer profile loads (General + Password + Reviews) | Verify |
| PR-019 | Reset own password | Verify |
| PR-020 | Generate earnings report | Verify |
| PR-021 | AI chart summary displays on start review | Verify |
| PR-022 | Multiple charts listed for same provider | Verify |
| PR-023 | AI auto-populates Yes/No/NA answers (overrideable) | Verify |
| PR-024 | AI-generated comments suggestion | Verify |
| PR-025 | Hover highlights related section in chart | Verify |
| PR-026 | Toggle hover-highlighting OFF | Verify |
| PR-027 | Attestation box required on every review | Verify |
| PR-028 | MRN field present and required | Verify |
| PR-029 | MRN AI auto-populated from chart | Verify |
| PR-035 | Manual MRN entry when AI fails | Verify |
| PR-036 | MRN correctable if AI extracted wrong value | Verify |
| PR-037 | MRN displayed on completed review (SA + Client) | Verify |
| PR-038 | MRN accepts standard formats, rejects invalid | Verify |
| PR-040 | Peer accesses per-provider review PDF (own only) | Verify |
| PR-041 | Peer accesses own scorecard (6 metrics) | Verify |

## Key Files
- `app/(dashboard)/peer/portal/` — peer dashboard
- `app/(dashboard)/peer/cases/[id]/` — split-screen review
- `components/peer/PeerCaseSplit.tsx` — split-screen component
- `app/api/peer/submit/route.ts` — submit with scoring
- `app/api/peer/ai-suggest-narrative/route.ts` — AI narrative
- `lib/scoring/default-based.ts` — scoring engine

## What Needs Work
- Verify all peer portal flows end-to-end
- Verify MRN workflow (auto-extract, manual entry, correction, snapshot)
- Verify attestation block rendering
- Verify save/exit preserves partial work
- Verify completed review is locked

## Unlocks
Chain 4 complete: reviews submitted with scores. Reports can now generate.
