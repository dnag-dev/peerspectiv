# Phase 6: Exceptions

| ID | What | Exception | Reason |
|----|------|-----------|--------|
| PR-005 | Pagination on peer dashboard | Not implemented | Card grid layout shows all cases. With typical peer case loads (10-75), pagination adds complexity without benefit. |
| PR-009 | "Complies with Standards" question | Template-driven | Not hardcoded. Admin creates this via form builder as a regular question. Correct by design. |
| PR-019 | Reset own password | Delegated to auth provider | Clerk handles password management. Same as SA-031, deferred to Phase 9. |
| PR-023 | AI auto-populates Yes/No/NA answers | AI prefills ratings primarily | AI suggests narrative (PR-024 works) and pre-fills rating fields. Boolean yes/no prefill would need per-question AI mapping. |
| PR-029 | MRN AI auto-populated from chart | Populated when available | MRN auto-fills if AI extraction pipeline has already processed the chart. Depends on extraction timing. |
