# Phase 3: Forms, Scoring & Attestation

**Size: M** | **~20 test cases** | **Pre-requisites: Phase 1**

## Goal
Ensure the form builder, scoring engine, and attestation block are complete. Forms are required before batch upload (forms are linked to cases). Scoring must be verified before reports can be trusted. Partially done — SA-044 and SA-045 were implemented this session.

## Test Cases

| ID | What | Personas | Type |
|----|------|----------|------|
| SA-043 | Forms list page loads | SA | Verify |
| SA-044 | Create form with per-question option sets | SA | **Done** |
| SA-044B | System attestation block on every review | SA, Peer | Verify |
| SA-045 | Per-question default answer pre-fill | SA, Peer | **Done** |
| SA-047 | Drag/reorder form fields | SA | Verify |
| SA-048 | Duplicate an existing form | SA | Verify |
| SA-049 | Publish vs Save Draft | SA | Verify |
| SA-050 | Delete form (no reviews) | SA | Verify |
| SA-051 | Cannot delete form with completed reviews | SA | Verify |
| SA-082 | Default value per question | SA | Verify |
| SA-083 | Required text on non-default answer | SA, Peer | Verify |
| SA-127 | Scoring config per form | SA | Verify |
| SA-127A | Scoring math: per-question (Yes=100%, No=0%, NA=excluded) | — | Verify |
| SA-127B | Scoring math: review-level (10Y + 1N + 1NA = 90.91%) | — | Verify |
| SA-127C | Scoring math: Question Analytics aggregation | — | Verify |
| SA-128 | A/B/C/NA scoring option set | SA | Verify |
| SA-129 | Pass/Fail scoring system | SA | Verify |
| PR-008 | Peer answers Yes/No/NA per question | Peer | Verify |
| PR-009 | Conditional comment on No answer | Peer | Verify |
| PR-012 | Submit computes score correctly | Peer | Verify |

## Key Files
- `components/forms/FormBuilderModal.tsx` — form builder (updated this session)
- `lib/scoring/default-based.ts` — scoring engine (pure, tested)
- `lib/scoring/default-based.test.ts` — scoring tests
- `app/(dashboard)/forms/FormsView.tsx` — forms list
- `app/api/company-forms/` — CRUD routes
- `app/api/peer/submit/route.ts` — integrates scoring engine

## What's Done
- SA-044: Per-question option sets (Yes/No/NA, A/B/C/NA, Text) — done this session
- SA-045: Per-question default answer — done this session
- Scoring engine implemented and tested

## What Needs Work
- Verify scoring engine integration in peer submit flow
- Verify attestation block renders on every review
- Verify drag/reorder, duplicate, publish/draft functionality
- Verify form deletion guards

## Unlocks
Forms ready for batch upload and peer review.
