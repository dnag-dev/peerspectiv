# Phase 3: Exceptions

| ID | What | Exception | Reason |
|----|------|-----------|--------|
| SA-127 | Form-level scoring system selector | Removed by design | Scoring is now per-question via field type dropdown (Yes/No/NA or A/B/C/NA). Data model retains scoring_system for backward compat. |
| SA-129 | Pass/Fail threshold configuration UI | Removed by design | Follows SA-127. API still supports pass_fail_threshold — only UI was removed. |
