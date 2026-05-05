# Phase 3: Deferred & Design Decisions

## No Deferred Items

All 20 test cases pass. Two items were flagged as PARTIAL but are intentional design decisions, not gaps.

## Intentional Design Decisions

| ID | What | Decision | Why |
|----|------|----------|-----|
| SA-127 | Form-level scoring system selector (Yes/No/NA, A/B/C/NA, Pass/Fail radio buttons) | **Removed by design** | User requested removal. Scoring is now per-question via the field type dropdown (Yes/No/NA or A/B/C/NA per question). The data model still supports scoring_system at the DB level for backward compatibility. |
| SA-129 | Pass/Fail threshold configuration UI | **Removed by design** | Follows from SA-127 — with per-question option sets, the form-level pass/fail threshold UI is no longer needed. The scoring engine still supports pass/fail logic at the API level. |

## Notes
- The scoring engine (`lib/scoring/default-based.ts`) is fully tested and supports all three scoring modes at the computation layer
- The per-question option set approach (SA-044/SA-045) replaces the form-level scoring selector
- If pass/fail thresholds need to be configurable in the future, the API already accepts `pass_fail_threshold` in PATCH payloads — only the UI needs to be added
