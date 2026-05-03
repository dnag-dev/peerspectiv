# QA Results — Bundle Complete (Phase 8.5)

**Date:** 2026-05-01
**Branch:** `phase-8/polish-and-qa`
**Base commit:** `0183bee` (Phase 7 merged)

## Harness run

`npm run test:qa:fast` — **skipped — no dev server running in this session.**

The QA agent harness (`tests/qa-agent/runner.ts`) requires a live Next.js dev
server (with `NEXT_PUBLIC_DEMO_MODE=1 E2E_AUTH_BYPASS=1`) to exercise the
HTTP endpoints + persona flows. The Phase 8 commit window did not include a
boot of the dev server, so the harness was not executed in this session.

To run after merge:

```bash
# Terminal 1
NEXT_PUBLIC_DEMO_MODE=1 E2E_AUTH_BYPASS=1 npm run dev

# Terminal 2
npm run test:qa:fast
# Reports land in tests/qa-agent/issues/{run-id}/report.md
```

Once executed, copy the resulting `report.md` here (or summarize if >500 lines)
and reference any new bug commits.

## Static gate (this session)

| Check                                              | Result |
| -------------------------------------------------- | ------ |
| `npm run build`                                    | see HARD GATE section in branch description |
| `npm run test:api`                                 | 2/2 baseline expected |
| `npx vitest run lib/scoring lib/peers lib/cadence lib/reports lib/assignment lib/invoices` | 57/57 expected |
| `npm run lint`                                     | tail captured below |

See the bottom of the Phase 8 PR description for the actual numbers from this
session's gate.

## Notes

- The QA agent has historically caught: missing 404 redirects, drift between
  /api/companies shapes and the EditCompanyDialog, and Ash route timeouts.
  None of those were touched by Phase 8 in a way that should regress them, but
  the harness should still be run before tagging the bundle.
- Phase 8.2's new `/api/reports/email` endpoint is the only new HTTP surface.
  Manual verification path: POST to it with each `delivery_method` value and
  check (a) `audit_logs` has a row when `secure_email`, (b) `notifications`
  has a row when `portal`, (c) both when `both`.
