# Phase 2: Peer Onboarding, State Machine & Credentialing

**Size: XL** | **~70 test cases** | **Pre-requisites: Phase 1**

## Goal
Implement the full peer lifecycle: 3 onboarding paths converging at Pending Credentialing, 7-state machine with transitions, license management, credentialer workflow, specialty management, and audit logging. This is the largest and most critical phase — peers must be Active before any case assignment.

## Test Cases — SuperAdmin (Peers)

| ID | What | Type |
|----|------|------|
| SA-021 | Peers list page loads with all columns | Verify |
| SA-022 | Add peer manually — Path B (direct entry) | Verify |
| SA-022B | Peer state machine: 7 states visible with badges | Verify |
| SA-023 | Duplicate email rejected | Verify |
| SA-024 | Edit peer license info | Verify |
| SA-025 | View peer's assigned reviews | Verify |
| SA-026 | Generate peer earnings report | Verify |
| SA-027 | Earnings excludes incomplete reviews | Verify |
| SA-028 | Mark reviews as paid | Verify |
| SA-029 | Delete/archive peer | Verify |
| SA-030 | Cannot delete peer with active assignments | Verify |
| SA-031 | Reset peer password | Verify |
| SA-031A | Generate invite link — Path A | Verify |
| SA-031B | Peer fills self-onboarding form | Verify |
| SA-031C | SA approves -> Pending Credentialing | Enhance |
| SA-031D | SA rejects / requests changes | Enhance |
| SA-031E | Path B forwards to credentialer | Verify |
| SA-031F | Non-Active peer blocked from assignment | Verify |
| SA-031G | Active -> License Expired auto-transition | Verify |
| SA-031H | License Expired -> Active on renewal | Enhance |
| SA-031I | Suspend peer (Active -> Suspended) | Enhance |
| SA-031J | Reinstate peer (Suspended -> Active) | Enhance |
| SA-031K | Archive peer (terminal state) | Enhance |
| SA-031L | **Audit log UI for state transitions** | **Build** |
| SA-073 | Max Case Assignment field | Verify |
| SA-075 | AI form upload creates peer — Path C | Verify |
| SA-099 | Specialties field renders as multi-select | Verify |
| SA-100 | Add single specialty | Verify |
| SA-101 | Add multiple specialties | Verify |
| SA-102 | Remove one specialty keeping others | Verify |
| SA-103 | Peers list displays all specialties | Verify |
| SA-104 | Filter peers list by specialty | Verify |
| SA-105 | Specialty taxonomy managed in Settings | Verify |
| SA-106 | Cannot delete specialty in use | Verify |
| SA-116 | License number and state on profile | Verify |
| SA-117 | License issue date and expiry date | Verify |
| SA-118 | Expiry must be after issue date | Verify |
| SA-119 | License date input validation | Verify |
| SA-120 | License document upload (PDF/image) | Verify |
| SA-121 | Expired license shows warning badge | Enhance |
| SA-122 | Expired license removes from assignment | Verify |
| SA-123 | License expiry warnings 14/7/3/1 + auto-reassign | Verify |
| SA-125 | License data syncs to credentialer view | Verify |
| SA-126 | License history / audit log | Verify |

## Test Cases — Credentialer

| ID | What | Type |
|----|------|------|
| CR-001 | Credentialer login lands on dashboard | Verify |
| CR-002 | Cannot access SA pages | Verify |
| CR-003 | Dashboard: 3 buckets with counts, clickable | Verify |
| CR-004 | Drill into peer from any bucket | Verify |
| CR-005 | New peer defaults to Pending Credentialing | Verify |
| CR-006 | Non-Active peer cannot be assigned | Verify |
| CR-007 | Upload license + supporting docs | Verify |
| CR-008 | Set Valid Until + mark Active | Verify |
| CR-009 | Expired Valid Until auto-deactivates | Verify |
| CR-011 | Courtesy email to peer before expiry | Verify |
| CR-013 | Credentialer monthly earnings | Verify |
| CR-014 | View/verify specialties | Verify |
| CR-015 | Edit specialties (add/remove) | Verify |
| CR-016 | View license metadata | Verify |
| CR-017 | Renew license (2 scenarios) | Enhance |
| CR-018 | License expiry notifications 14/7/3/1 + post | Verify |
| CR-019 | License doc required before credentialing | Verify |
| CR-020 | Configurable per-peer rate | Verify |

## Test Cases — Peer/Reviewer (Profile)

| ID | What | Type |
|----|------|------|
| PR-031 | Peer profile displays all specialties | Verify |
| PR-033 | Peer profile displays license info | Verify |
| PR-034 | Peer sees expiry warning on dashboard | Verify |
| PR-039 | Reviewer name + license auto-populated | Verify |

## Key Files
- `lib/peers/state-machine.ts` — state transitions
- `lib/peers/capacity.ts` — capacity math
- `app/(dashboard)/peers/` — peers list + detail
- `app/(dashboard)/peers/onboarding-queue/` — onboarding queue
- `app/onboard/[token]/` — self-onboarding form
- `app/api/peers/` — CRUD + invite + specialties
- `app/api/cron/license-expiry/` — auto-transition cron
- `app/(credentialing)/` — credentialer portal
- `app/api/credentialing/` — credentialer API
- `lib/db/schema.ts` — peer_state_audit, peer_specialties, peer_invite_tokens

## What Needs Building
- **SA-031L**: Audit log UI component reading `peer_state_audit` table
- **SA-031C/D**: Wire approve/reject actions on onboarding queue rows
- **SA-031H**: Renewal flow UI (credentialer updates license -> peer reactivates)
- **SA-031I-K**: Suspend/reinstate/archive buttons on peer detail page
- **SA-121**: License expiry badge component on peers list

## Cross-Persona Flows Unlocked
- Chain 1: SA invites -> Peer fills form -> SA approves -> Credentialer verifies -> Active
- Chain 3: License dates -> Warnings -> Auto-expire -> Reassign -> Renew -> Reactivate
- Chain 6: Full credentialer workflow
- Chain 8: Credentialer earnings tracked
- **Peers are now Active and assignable for Phase 5+**
