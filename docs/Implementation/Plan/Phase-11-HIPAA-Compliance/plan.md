# Phase 11: HIPAA Compliance

**Size: L** | **Pre-requisites: Phases 1-9 complete** | **Priority: CRITICAL — must complete before production use with real patient data**

## Goal
Ensure the Peerspectiv platform meets HIPAA Security Rule and Privacy Rule requirements for handling Protected Health Information (PHI). This covers encryption, access controls, vendor agreements, session management, and audit infrastructure.

---

## Current Status

| Area | Status | Risk Level |
|------|--------|------------|
| Data in transit (HTTPS/TLS) | COMPLIANT | Low |
| Access control (RBAC) | COMPLIANT | Low |
| PHI in logs | COMPLIANT | Low |
| Email content | COMPLIANT | Low |
| Client-side storage | COMPLIANT | Low |
| Session management | AT RISK | Medium |
| Data at rest (encryption) | NON-COMPLIANT | High |
| File storage (chart PDFs) | NON-COMPLIANT | High |
| Third-party BAAs | NON-COMPLIANT | Critical |
| PHI sent to AI service | NON-COMPLIANT | Critical |

---

## Implementation Tasks

### Task 1: Execute BAAs with All Third-Party Vendors (Critical)
**Type: Legal/Contractual** | **Priority: P0** | **Effort: Non-code**

Business Associate Agreements required with:

| Vendor | What PHI They Handle | BAA Status |
|--------|---------------------|------------|
| **Anthropic (Claude)** | Chart text, clinical summaries, MRN extraction | NEEDED — Anthropic offers HIPAA-eligible API; requires enterprise plan |
| **Vercel** | Chart PDF files via Blob storage; application hosting | NEEDED — Vercel offers HIPAA BAA on Enterprise plan |
| **Neon** | All database records (patient names, MRNs, provider data) | NEEDED — Neon offers BAA on Pro/Enterprise plan |
| **Resend** | Email addresses (no patient PHI in body) | LOW RISK — but BAA recommended |
| **Aautipay** | Peer financial data (beneficiary IDs, bank accounts) | NEEDED — financial PHI |
| **Clerk** | User emails and auth tokens (no patient PHI) | LOW RISK — but BAA recommended |

**Action items:**
- [ ] Contact Anthropic for HIPAA-eligible API access + BAA
- [ ] Upgrade Vercel to Enterprise plan with BAA
- [ ] Upgrade Neon to plan with BAA
- [ ] Contact Aautipay for BAA
- [ ] Document all BAA execution dates in compliance folder

---

### Task 2: Switch Chart PDF Storage to Private Access (High)
**Type: Code** | **Priority: P1** | **Effort: S**

**Current state:** `lib/storage/index.ts` uses `access: 'public'` for Vercel Blob uploads. Chart PDFs are accessible to anyone with the URL.

**Required change:** Switch to `access: 'private'` and generate signed/time-limited URLs when files need to be viewed.

**Files to modify:**
- `lib/storage/index.ts` — change `access: 'public'` to `access: 'private'`
- `app/api/upload/chart/route.ts` — update file upload to use private access
- `components/peer/PeerCaseSplit.tsx` — generate signed URL for iframe viewer
- Any endpoint returning `chartFilePath` URLs to the browser

**Test:** Verify chart PDFs are NOT accessible via direct URL without a valid signed token.

---

### Task 3: Verify Database Encryption at Rest (High)
**Type: Infrastructure** | **Priority: P1** | **Effort: Non-code**

**Current state:** Neon PostgreSQL connection uses `sslmode=require` (encryption in transit). Encryption at rest depends on Neon's infrastructure.

**Action items:**
- [ ] Verify Neon encrypts data at rest (AES-256) — check Neon dashboard / docs
- [ ] Document encryption standards in compliance records
- [ ] If Neon does NOT encrypt at rest, evaluate field-level encryption for PHI columns

---

### Task 4: Reduce Session Timeout for Production (Medium)
**Type: Code** | **Priority: P2** | **Effort: S**

**Current state:** Demo cookie set to 30 days (`maxAge: 60 * 60 * 24 * 30`). HIPAA recommends automatic session termination after 15-30 minutes of inactivity.

**Files to modify:**
- `app/api/demo/login/route.ts` — reduce `maxAge` to 30 minutes for production
- Clerk configuration — set session timeout to 30 minutes in Clerk dashboard
- Consider adding an inactivity timer on the client side that auto-logs out

**Test:** Verify session expires after 30 minutes of inactivity.

---

### Task 5: Secure the demo_user Cookie (Medium)
**Type: Code** | **Priority: P2** | **Effort: S**

**Current state:** `demo_user` cookie set with `httpOnly: false` — accessible to JavaScript (XSS risk).

**Files to modify:**
- `app/api/demo/login/route.ts` — set `httpOnly: true` for production
- `components/layout/Sidebar.tsx` — refactor to read role from server-side instead of parsing cookie client-side
- Alternative: Keep `httpOnly: false` only in demo mode; disable demo mode entirely in production

**Test:** Verify cookie is not accessible via `document.cookie` in production.

---

### Task 6: Add PHI Access Audit Trail (Medium)
**Type: Code** | **Priority: P2** | **Effort: M**

**Current state:** `audit_logs` table exists and records state transitions and admin actions. But no dedicated PHI access logging (who accessed which patient record, when).

**Required:** HIPAA requires logging of all access to PHI — who viewed it, when, from where.

**Implementation:**
- Add middleware or API-level logging for all endpoints that return PHI:
  - `GET /api/cases/[id]` — log who viewed which case
  - `GET /api/reports/generate/[type]` — log who generated which report
  - Chart file access — log who downloaded which chart
- Store in `audit_logs` table with: `userId`, `action: 'phi_access'`, `resourceType`, `resourceId`, `ipAddress`, `timestamp`

**Files to modify:**
- `lib/utils/audit.ts` — add `logPhiAccess()` helper
- All API routes returning PHI data — add audit calls

---

### Task 7: Consider Field-Level Encryption for Most Sensitive PHI (Low)
**Type: Code** | **Priority: P3** | **Effort: L**

**Current state:** All PHI stored in plaintext in PostgreSQL. If Neon provides encryption at rest (Task 3), this may be sufficient. Field-level encryption is an additional layer of defense.

**PHI columns to consider encrypting:**
- `review_cases.patient_first_name`, `patient_last_name` — patient identity
- `review_cases.mrn_number` — medical record number
- `ai_analyses.chart_text_extracted` — raw chart text (highest PHI density)
- `review_results.mrn_number` — MRN snapshot

**Approach:**
- Use AES-256-GCM encryption with a KMS-managed key
- Encrypt on write, decrypt on read at the application layer
- Store encrypted values as `bytea` or base64 `text`
- Key management via environment variable or AWS KMS / GCP KMS

**Trade-offs:**
- Cannot query encrypted columns with SQL (no `WHERE mrn = 'X'`)
- Adds latency for encrypt/decrypt operations
- Increases code complexity

**Recommendation:** Implement if Neon does NOT provide encryption at rest, or if required by specific client security assessments.

---

### Task 8: PHI Redaction Before AI Processing (Low)
**Type: Code** | **Priority: P3** | **Effort: M**

**Current state:** Raw chart text (including patient names, DOB, SSN) is sent to Claude API for analysis.

**Options:**
1. **BAA with Anthropic** (Task 1) — if Anthropic signs a BAA, sending PHI is covered legally
2. **Redact PHI before sending** — strip patient names, DOB, SSN from chart text before AI processing
3. **Both** — BAA + redaction for defense in depth

**If implementing redaction:**
- Add a PHI redaction step in `lib/pdf/extractor.ts` before sending to Claude
- Use regex patterns to detect and replace: names (from provider list), DOB, SSN, phone numbers
- Replace with `[REDACTED]` tokens
- Keep original text in database (encrypted per Task 7); send redacted version to AI

**Files to modify:**
- `lib/pdf/extractor.ts` — add `redactPhi()` function before Claude API call
- `lib/ai/chart-analyzer.ts` — call redaction before analysis

---

### Task 9: Disable Demo Mode in Production (Medium)
**Type: Code** | **Priority: P2** | **Effort: S**

**Current state:** `NEXT_PUBLIC_DEMO_MODE=1` enables demo login buttons. This should be disabled in production.

**Action items:**
- [ ] Remove `NEXT_PUBLIC_DEMO_MODE=1` from production environment variables on Vercel
- [ ] Verify demo login buttons do NOT appear when env var is absent
- [ ] Ensure Clerk auth is the only login path in production

---

### Task 10: HIPAA Security Risk Assessment Documentation (Medium)
**Type: Documentation** | **Priority: P2** | **Effort: M**

**Required:** HIPAA requires a formal security risk assessment. Document:

- [ ] All PHI data flows (where PHI enters, is stored, is transmitted, is accessed)
- [ ] All third-party vendors with PHI access + BAA status
- [ ] Encryption standards (in transit + at rest)
- [ ] Access control matrix (who can access what)
- [ ] Incident response plan (breach notification procedures)
- [ ] Employee training requirements
- [ ] Physical safeguards (N/A for cloud-hosted SaaS)
- [ ] Data retention and destruction policies

---

## Implementation Priority

| Priority | Tasks | Effort | Type |
|----------|-------|--------|------|
| **P0 — Before any real patient data** | Task 1 (BAAs) | Non-code | Legal |
| **P1 — Before production launch** | Task 2 (private storage), Task 3 (DB encryption) | S + Non-code | Code + Infra |
| **P2 — Before GA** | Task 4 (session timeout), Task 5 (cookie security), Task 6 (PHI audit trail), Task 9 (disable demo), Task 10 (risk assessment) | M | Code + Docs |
| **P3 — Defense in depth** | Task 7 (field encryption), Task 8 (PHI redaction) | L | Code |

## Dependency Flow

```
Task 1 (BAAs) — legal, no code dependency
  |-> Task 2 (private storage) — code change
  |-> Task 3 (verify DB encryption) — infra check
       |-> Task 7 (field encryption — only if Task 3 fails)
  |-> Task 4 (session timeout) — code change
  |-> Task 5 (cookie security) — code change
  |-> Task 6 (PHI audit trail) — code change
  |-> Task 8 (PHI redaction — optional if Task 1 covers)
  |-> Task 9 (disable demo mode) — config change
  |-> Task 10 (risk assessment doc) — documentation
```

## Success Criteria

- [ ] BAAs executed with Anthropic, Vercel, Neon, Aautipay
- [ ] Chart PDFs accessible only via signed URLs (no public access)
- [ ] Database encryption at rest verified
- [ ] Session timeout ≤ 30 minutes in production
- [ ] PHI access audit trail logging all views
- [ ] Demo mode disabled in production
- [ ] Security risk assessment documented
- [ ] Zero plaintext PHI in client-side storage (already done)
- [ ] Zero PHI in notification emails (already done)
