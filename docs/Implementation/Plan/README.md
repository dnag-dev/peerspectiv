# Implementation Plan — Peerspectiv

~257 test cases across 6 files: SuperAdmin (132), Client (42), Peer/Reviewer (41), Credentialer (20), Auth (16), Future (6).

## 8 Cross-Persona Dependency Chains

1. **Peer Onboarding**: SA invites -> Peer fills form -> SA approves -> Credentialer verifies -> Peer becomes Active
2. **License Lifecycle**: SA sets dates -> Warnings fire -> Auto-expire -> Reassign cases -> Credentialer renews -> Reactivate
3. **Case Pipeline**: SA uploads batch -> AI analyzes -> AI suggests assignments -> SA approves -> Peer reviews -> Score computed
4. **Reports**: Completed reviews -> 5 report types -> Client views -> Download/email
5. **Invoicing**: Pricing config -> Reviews completed -> Invoice generated -> Client views/pays
6. **Client Portal**: Client uploads -> Assignment -> Review -> Dashboard scores -> Reports -> Download
7. **Credentialer**: New peer in queue -> Verify license -> Mark Active -> Track earnings
8. **Auth**: Login -> RBAC -> Role routing (done last)

## Phase Sequence

```
Phase 1 (Companies)
  |-> Phase 2 (Peers + Credentialer)
       |-> Phase 3 (Forms)
            |-> Phase 4 (Upload + AI)
                 |-> Phase 5 (Assignments)
                      |-> Phase 6 (Peer Review)
                           |-> Phase 7 (Reports + Invoicing + Client)
                                |-> Phase 8 (Settings + Payments)
                                     |-> Phase 9 (Full E2E)
                                          |-> Phase 10 (Auth & RBAC)
                                               |-> Phase 11 (HIPAA Compliance)
```

## Summary

| Phase | Focus | Tests | Size | Status |
|-------|-------|-------|------|--------|
| 1 | [Companies & Providers](Phase-01-Companies-Providers/plan.md) | ~22 | M | |
| 2 | [Peer Onboarding + Credentialer](Phase-02-Peer-Onboarding-Credentialer/plan.md) | ~70 | XL | |
| 3 | [Forms & Scoring](Phase-03-Forms-Scoring/plan.md) | ~20 | M | Partially done |
| 4 | [Upload + AI Pipeline + Tags](Phase-04-Upload-AI-Tags/plan.md) | ~22 | L | |
| 5 | [Assignments & Notifications](Phase-05-Assignments-Notifications/plan.md) | ~25 | L | |
| 6 | [Peer Review Experience](Phase-06-Peer-Review/plan.md) | ~35 | XL | |
| 7 | [Reports, Invoicing & Client Portal](Phase-07-Reports-Invoicing-Client/plan.md) | ~65 | L | |
| 8 | [Settings, Payments & Remaining](Phase-08-Settings-Payments/plan.md) | ~25 | M | |
| 9 | [Full E2E + Future](Phase-09-E2E-Future/plan.md) | ~263 | L | |
| 10 | [Auth & RBAC](Phase-10-Auth-RBAC/plan.md) | ~18 | M | |
| 11 | [HIPAA Compliance](Phase-11-HIPAA-Compliance/plan.md) | 10 tasks | L | CRITICAL |

Auth (Phase 10) and HIPAA (Phase 11) must complete before production use with real patient data.
