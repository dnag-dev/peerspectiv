# Phase 4: Deferred & Partial Items

## Partial Implementations (Fixed)

| ID | What | Status | What Was Done |
|----|------|--------|---------------|
| SA-053 | Cadence-shaped tag names rejected for global tags | **Fixed** | API rejects names matching Q1-4 YYYY, Mon YYYY, Mon-Mon YYYY patterns |
| SA-088 | Filename-based specialty auto-detection | **Fixed** | Added parseSpecialtyFromFilename() utility mapping "Family_Smith.pdf" → "Family Medicine" etc. Available for admin-side batch upload integration |
| SA-090 | Provider name disambiguation | **Fixed** | Auto-select only when exactly 1 provider matches last name. If 0 or multiple matches, field left empty for user to pick from dropdown |

## Routing Issue (Non-blocking)

| Item | What | Fix When |
|------|------|----------|
| Client sidebar "Submit Records" | Links to `/portal/upload` (stub) instead of `/portal/submit` (working wizard) | Phase 7 or 10 — sidebar nav cleanup |

## Files Modified

- `app/api/tags/route.ts` — SA-053: cadence-name pattern rejection
- `components/portal/ClientSubmitWizard.tsx` — SA-088: specialty keyword map + SA-090: multi-match disambiguation
