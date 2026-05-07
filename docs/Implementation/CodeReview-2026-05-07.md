# Peerspectiv Code Review

**Date:** 2026-05-07
**Scope:** Full codebase — security, database, AI integration, frontend, business logic
**Stack:** Next.js 14 / Drizzle ORM (Neon PostgreSQL) / Clerk Auth / Anthropic Claude / Vercel

---

## Overview

Peerspectiv is a healthcare peer review management platform spanning 230+ components across 4 portals (admin, client, peer, credentialing) with 39+ API routes. The codebase is well-architected with strong patterns in many areas, but has **critical security gaps in API authorization** that need immediate attention.

---

## CRITICAL Issues (Fix Immediately)

### 1. Missing Authentication/Authorization on Financial & Mutation Endpoints

Multiple API routes have **no auth checks at all**, meaning anyone with the URL can call them:

| Route | Risk |
|---|---|
| `app/api/settings/route.ts` — GET/PUT | Anyone can modify global pay rates, invoice terms |
| `app/api/payouts/[id]/route.ts` — PATCH | Anyone can approve payouts and trigger fund transfers |
| `app/api/assign/approve/route.ts` — POST | Anyone can approve case assignments |
| `app/api/peer/submit/route.ts` — POST | No peer ownership check — submit reviews for any case (IDOR) |
| `app/api/providers/route.ts` — POST | Anyone can create provider records |
| `app/api/providers/[id]/route.ts` — PATCH | Anyone can modify any provider |
| `app/api/peers/[id]/route.ts` — PATCH | No scope check — modify any peer's rates/status |
| `app/api/cases/[id]/route.ts` — PATCH | No scope validation on case edits |
| `app/api/credentialer-users/route.ts` — GET | No auth on GET (POST has `requireAdmin()`) |
| `app/api/companies/[id]/route.ts` — GET | No auth — anyone can read company details |
| `app/api/invoices/[id]/route.ts` — GET | No auth — anyone can read any invoice |
| `app/api/invoices/route.ts` — GET | No company filter enforced — leaks all invoices |
| `app/api/reports/generate/route.ts` — POST | No auth — anyone can generate reports for any company |
| `app/api/peer/ai-suggest-narrative/route.ts` — POST | No auth — AI endpoint exposed, case data leak + DoS risk |
| `app/api/payouts/route.ts` — GET | Weak auth — checks userId exists but not role |

**Severity:** CRITICAL
**Impact:** Remote attacker can modify financial settings, approve payouts, submit fake reviews, and exfiltrate company/invoice/case data.
**Fix:** Add `getCallerScope()` or `requireAdmin()` checks to every route. Enforce tenant isolation on all GET endpoints.

---

### 2. Aautipay Webhook Has No Signature Verification

**File:** `app/api/webhooks/aautipay/route.ts`

The webhook handler processes payout status updates with **zero authentication**. The code acknowledges this with a comment: _"Aautipay docs (as of 2026-04-26) do not document an HMAC signing scheme."_

**Severity:** CRITICAL
**Impact:** An attacker can send fake webhook events to mark payouts as settled, manipulate peer account status, or trigger false payment confirmations.
**Fix:** Coordinate with Aautipay to implement webhook signing. In the interim, consider IP allowlisting or a shared secret query parameter.

---

### 3. Demo Header Auth Bypass Risk

**File:** `lib/db/index.ts` — `getCallerScope()` function

The function checks demo headers (`x-demo-role`, `x-demo-company-id`) **before** Clerk authentication. In production, if an attacker sets the `x-demo-role: admin` header on a request, it could bypass Clerk entirely and grant admin access.

**Severity:** CRITICAL
**Impact:** Full authentication bypass — attacker gains admin role without credentials.
**Fix:** Reverse the check order: verify Clerk auth first, only fall back to demo headers when Clerk is explicitly disabled/not configured (`NEXT_PUBLIC_DEMO_MODE=1`).

---

### 4. `eval("require")` in DocuSign Client

**File:** `lib/docusign/client.ts:38`

```typescript
const docusign: any = eval("require")('docusign-esign');
```

Uses `eval("require")` to work around webpack bundling. While the input is a string literal, this is a security anti-pattern that will flag on any scanner and violates CSP policies.

**Severity:** CRITICAL (scanner/compliance), LOW (practical exploit risk)
**Fix:** Use dynamic `import()` or add `docusign-esign` to `serverComponentsExternalPackages` in `next.config.mjs`.

---

## HIGH Issues

### 5. Missing Database Indexes

**File:** `lib/db/schema.ts`

The schema has only 6 indexes but is missing them on **15+ frequently queried columns**:

| Table | Column(s) Missing Index | Used In |
|---|---|---|
| `reviewCases` | `companyId`, `peerId`, `batchId`, `status`, `providerId`, `cadencePeriodLabel` | Client portal, peer views, invoicing |
| `reviewResults` | `peerId`, `submittedAt` | Payout aggregations, date-range queries |
| `peers` | `state`, `status` | Assignment engine, peer filtering |
| `providers` | `companyId` | Company detail pages |
| `batches` | `companyId` | Batch listing |
| `peerPayouts` | `peerId`, `status`, `periodStart`, `periodEnd` | Payout management |
| `contracts` | `companyId`, `status` | Contract tracking |
| `auditLogs` | `userId`, `resourceId`, `createdAt` | Audit trail queries |
| `notifications` | `userId`, `createdAt` | Notification bell |

**Impact:** As data grows, queries on these columns will do full table scans, causing slowdowns across the admin dashboard and client portal.
**Fix:** Add indexes in a migration. Prioritize `reviewCases` and `reviewResults` columns first.

---

### 6. Missing Foreign Key CASCADE Behavior

**File:** `lib/db/schema.ts`

13+ foreign key references lack `onDelete` behavior. Deleting a company leaves orphaned providers, batches, cases, invoices, and payouts across the database.

**Affected references:**
- `providers.companyId` (line 72)
- `batches.companyId` (line 164)
- `reviewCases.batchId`, `.providerId`, `.peerId`, `.companyId` (lines 191-194)
- `aiAnalyses.caseId` (line 260)
- `reviewResults.peerId` (line 295)
- `correctiveActions.companyId`, `.providerId`, `.sourceCaseId` (lines 378-387)
- `reviewCycles.companyId` (line 416)
- `clientFeedback.companyId` (line 458)
- `reportRuns.companyId` (line 499)

**Fix:** Add `onDelete: 'cascade'` (or `'set null'` where appropriate) to each reference. Deploy via migration with a backfill to clean any existing orphans.

---

### 7. Floating-Point Financial Arithmetic

**Files:**
- `app/api/invoices/route.ts:147-202`
- `app/api/payouts/approve-all/route.ts:42-45`

```typescript
// Invoice route — uses Number + toFixed()
const subtotal = +(unitPrice * billedQuantity).toFixed(2);
const total = +(subtotal + tax).toFixed(2);

// Payouts route — accumulates with Number
const totalAmount = pending.reduce((s, p) => s + Number(p.amount ?? 0), 0);
```

JavaScript `Number` is 64-bit float, which causes precision loss on financial sums. The codebase already has a correct integer-cents pattern in `lib/invoices/generate.ts` (`toCents()`/`formatCents()`).

**Impact:** Rounding errors accumulate across hundreds of invoices/payouts, causing financial discrepancies.
**Fix:** Standardize all financial arithmetic on the existing `toCents()`/`formatCents()` pattern. Replace all `toFixed()` usage with integer cent math.

---

### 8. AI Prompt Injection via Uploaded PDFs

**Files:**
- `lib/ai/chart-analyzer.ts:153-160`
- `lib/ai/quality-scorer.ts:39-54`
- `app/api/peer/ai-suggest-narrative/route.ts:53-62`

PDF text content is injected directly into the Claude prompt without sanitization:

```typescript
const userPrompt = `...CHART TEXT:\n---\n${chartText}\n---`;
```

A crafted PDF could contain prompt injection instructions that manipulate the AI's clinical analysis output, generate biased reviews, or expose information from the system prompt.

**Impact:** Compromised AI outputs in a healthcare peer review context could have regulatory and clinical quality implications.
**Fix:** Add content sanitization, explicit prompt boundaries, and consider Claude's structured output mode to constrain responses.

---

### 9. No Error Boundaries

No `error.tsx` files exist in any route group (`/(dashboard)`, `/(client)`, `/(credentialing)`). If a server component throws an unhandled error, the entire page crashes with the default Next.js error page.

**Fix:** Add `error.tsx` files to each route group with appropriate fallback UI.

---

## MEDIUM Issues

### 10. Missing Input Validation

| Endpoint | Issue |
|---|---|
| `app/api/upload/chart/route.ts:40-45` | Validates MIME type only, not PDF magic bytes — spoofable |
| `app/api/forms/ai-draft/route.ts:51-87` | No length limits on specialty/form name (DoS risk on AI tokens) |
| `app/api/invoices/generate/route.ts` | Date ranges accepted as strings without validation |
| `app/api/invoices/route.ts:91-108` | Financial override amounts have no upper bound check |
| `app/api/cases/route.ts:68-143` | Foreign key IDs not verified before insert |

**Fix:** Add validation at each endpoint. For file uploads, check PDF magic bytes (`%PDF`). For text inputs, enforce length limits. For financial overrides, add reasonable bounds.

---

### 11. Inconsistent AI Error Handling

Each AI integration handles errors differently:

| File | Behavior |
|---|---|
| `lib/ai/chart-analyzer.ts:244-249` | Catches all errors, silently sets status to 'failed' |
| `lib/ai/quality-scorer.ts:56-61` | Returns silently on JSON parse failure |
| `app/api/forms/ai-draft/route.ts:121-145` | Logs errors and returns 502 |
| `lib/ai/assignment-engine.ts:162` | Throws error if JSON not found |

Additionally, JSON parsing uses greedy regex `\{[\s\S]*\}` which matches the last `}` in the response, potentially capturing unintended content.

**Fix:** Standardize on a shared `parseAIJson()` helper with try-catch, schema validation (Zod), and consistent error logging.

---

### 12. N+1 Query in Payouts

**File:** `app/api/payouts/route.ts:63`

Specialty lookup uses a correlated subquery per peer row:

```sql
(SELECT specialty FROM peer_specialties WHERE peer_id = peers.id ORDER BY specialty LIMIT 1)
```

**Fix:** Replace with a `LEFT JOIN` on `peerSpecialties`.

---

### 13. Double State Update in Credentialing

**File:** `app/api/credentialing/peers/[id]/route.ts:191-210`

The route directly sets `status: 'active'` in the database AND calls `transitionPeer()`, creating two sources of truth. If `transitionPeer()` fails after the direct update, the peer state and audit log become inconsistent.

**Fix:** Remove the direct `status: 'active'` update and rely solely on the state machine.

---

### 14. No Rate Limiting

No rate limiting found on any endpoint. Key concerns:

| Endpoint | Risk |
|---|---|
| `/api/peer/ai-suggest-narrative` | Claude API credit exhaustion |
| `/api/forms/ai-draft` | Claude API credit exhaustion |
| `/api/upload/chart-extract` | Claude API credit exhaustion |
| `/api/leads` | Spam/abuse |
| Auth-related endpoints | Brute force |

**Fix:** Add rate limiting via Vercel's `@vercel/edge` rate limiter or middleware-based token bucket. Prioritize AI endpoints.

---

### 15. Large Client Components Without Code Splitting

Three components exceed 900+ lines and are bundled eagerly:

| Component | Lines | Opportunity |
|---|---|---|
| `components/peer/ReviewForm.tsx` | 989 | Lazy load — shown only when peer opens a case |
| `components/batches/NewBatchModal.tsx` | 973 | Lazy load — modal, not needed on initial render |
| `app/(dashboard)/invoices/InvoicesView.tsx` | 656 | Split sub-modals into lazy-loaded chunks |
| `app/(dashboard)/payouts/PayoutsView.tsx` | 585 | Split sub-modals into lazy-loaded chunks |

**Fix:** Use `next/dynamic` or `React.lazy()` for modal/secondary components.

---

## LOW Issues

### 16. Accessibility Gaps

- Interactive elements lack `aria-label` attributes (icon-only buttons)
- Sidebar (`components/layout/Sidebar.tsx`) missing `role="navigation"`
- Status badges and chips lack screen reader context
- Form fields in `ReviewForm.tsx` missing `aria-required`, `aria-invalid`
- Dropdown menus missing `aria-modal`, `aria-labelledby`

---

### 17. Missing NOT NULL Constraints

Several foreign key columns allow NULL when they logically shouldn't:
- `providers.companyId` (line 72)
- `batches.companyId` (line 164)
- `reviewCases.batchId`, `.providerId`, `.peerId`, `.companyId` (lines 191-194)

**Fix:** Add `.notNull()` in a migration after verifying no existing NULLs.

---

### 18. HIPAA Compliance Verification

The BAA template (`lib/contracts/templates.ts:82`) mentions "Zero Data Retention endpoint" for Anthropic API calls. Verify that the actual `ANTHROPIC_API_KEY` and API configuration route calls through a ZDR-configured endpoint, especially for `chart-analyzer.ts` which processes PHI (Protected Health Information).

---

### 19. Unbounded Queries

- `app/api/invoices/route.ts:64-66` — When a WHERE clause exists, query has no LIMIT (falls through without the default 200-row cap)
- Notification and audit log queries should also be bounded

---

### 20. Cookie Parsing Vulnerability

**File:** `app/api/credentialing/peers/[id]/route.ts:25-30`

```typescript
const parsed = JSON.parse(decodeURIComponent(raw)) as { role?: string; email?: string };
```

No validation that `raw` is valid before decoding. Malformed URI encoding crashes the server. The `role` field is used for authorization without whitelist validation.

**Fix:** Wrap in try-catch, validate `role` against allowed values `['admin', 'credentialer']`.

---

## What's Done Well

| Area | Assessment |
|---|---|
| **SQL injection protection** | All queries use Drizzle ORM parameterized queries |
| **XSS protection** | No `dangerouslySetInnerHTML`, proper React escaping throughout |
| **Middleware routing** | Host-based routing, protected route headers, proper cache-busting |
| **Cron security** | All cron routes verify `CRON_SECRET` |
| **DocuSign webhooks** | Proper HMAC-SHA256 with `crypto.timingSafeEqual()` |
| **Server component data fetching** | Direct DB queries with `Promise.all()` for parallel loads |
| **Design system** | Consistent token-based styling across all 149 pages |
| **Peer state machine** | Well-modeled transitions with audit trail |
| **TypeScript strict mode** | Enabled with path aliases |
| **Drizzle schema** | Proper UUID primary keys, timezone-aware timestamps, JSONB for complex data |

---

## Recommended Fix Priority

### This Week (Critical)
1. Add auth checks to all 16 unprotected API routes (Issue 1)
2. Fix `getCallerScope()` header priority — Clerk before demo headers (Issue 3)
3. Add signature verification or IP allowlist for Aautipay webhook (Issue 2)
4. Replace `eval("require")` in DocuSign client (Issue 4)

### Next Sprint (High)
5. Add database indexes on high-traffic columns (Issue 5)
6. Add foreign key CASCADE behavior (Issue 6)
7. Standardize financial arithmetic on integer cents (Issue 7)
8. Add AI prompt boundaries for chart analysis (Issue 8)
9. Add `error.tsx` boundaries to all route groups (Issue 9)

### Backlog (Medium/Low)
10. Input validation hardening (Issue 10)
11. Standardize AI error handling (Issue 11)
12. Fix N+1 query in payouts (Issue 12)
13. Rate limiting on AI and auth endpoints (Issue 14)
14. Code splitting for large components (Issue 15)
15. Accessibility audit (Issue 16)
16. NOT NULL constraints migration (Issue 17)
17. HIPAA ZDR endpoint verification (Issue 18)
