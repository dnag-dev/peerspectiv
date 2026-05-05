# Phase 2: Deferred & Partial Items

Items that were identified during Phase 2 verification but belong to later phases. Test these once the corresponding phase is complete.

## Deferred to Later Phases

| ID | What | Deferred To | Why |
|----|------|-------------|-----|
| SA-028 | Mark individual peer reviews as Paid/Not Paid toggle | **Phase 8** (Settings & Payments) | Requires payment tracking infrastructure (peer_payouts table exists but no UI to toggle per-review paid status) |
| SA-031 | Reset peer password from admin | **Phase 9** (Auth & RBAC) | Requires Clerk admin API integration for password management |
| SA-075 | AI form upload auto-creates peer (Path C) | **Phase 4** (Upload + AI Pipeline) | Requires AI extraction pipeline to parse enrollment form PDFs into peer profile fields |

## Partial Implementations (Fixed but Worth Re-Testing)

| ID | What | Status | What Was Done | Re-Test When |
|----|------|--------|---------------|--------------|
| SA-023 | Duplicate email rejected on peer creation | **Fixed** | Added friendly 409 "email already exists" error instead of generic 500 DB error | Phase 10 (E2E) |
| SA-030 | Cannot archive/suspend peer with active assignments | **Fixed** | API now checks for assigned/in_progress cases before allowing archive or suspend transition | Phase 10 (E2E) |
| SA-126 | License history/audit log | **Fixed** | Added GET /api/peers/[id]/credentialing-log endpoint + PeerCredentialingLog UI component on peer detail page | Phase 10 (E2E) |
| CR-007 | Upload license file during credentialing | **Partial** | Currently URL-based input (credentialer pastes a URL). File upload dropzone could be added — the upload API exists at /api/upload/form-template. Functional but not ideal UX. | Phase 8 or 10 |
| CR-011 | Courtesy email to peer before expiry | **Partial** | Email notifications go to credentialing inbox (admin), not directly to the peer. The spec suggests an optional toggle to email the peer themselves. | Phase 5 (Notifications) |

## Files Modified for Fixes

- `app/api/peers/route.ts` — SA-023: duplicate email catch with 409 response
- `app/api/peers/[id]/state-transition/route.ts` — SA-030: active case check before archive/suspend
- `app/api/peers/[id]/credentialing-log/route.ts` — SA-126: new GET endpoint
- `app/(dashboard)/peers/[id]/PeerCredentialingLog.tsx` — SA-126: new UI component
- `app/(dashboard)/peers/[id]/page.tsx` — SA-126: wired credentialing log into peer detail
