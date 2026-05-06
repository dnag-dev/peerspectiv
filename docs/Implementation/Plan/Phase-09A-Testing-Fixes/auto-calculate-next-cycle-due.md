# Phase 9A: Testing Fixes & Enhancements

**Size: Ongoing** | **Pre-requisites: Phases 1-9 complete** | **Priority: As found during manual testing**

## Goal
Track and fix bugs, enhancements, and missing features discovered during manual testing. Items are added here as they're found.

---

## Items

| # | What | Type | Status | Priority |
|---|------|------|--------|----------|
| 1 | Auto-calculate `next_cycle_due` from Review Cadence config instead of manual entry | Enhancement | TODO | Medium |

---

## Item Details

### 1. Auto-calculate next_cycle_due from Review Cadence

**Current behavior:** `companies.next_cycle_due` is a manually-set date field. The "Upcoming Cycles" section on the admin dashboard queries companies where this date falls within the next 30 days.

**Expected behavior:** When a company has Review Cadence configured (quarterly, monthly, custom), the system should automatically compute when the next cycle ends based on the cadence config and fiscal year start month, and populate `next_cycle_due` accordingly. This should update:
- When cadence config is saved (SA-063A/B/C)
- When a review cycle completes
- Via a daily cron job to keep dates current

**Files involved:**
- `lib/cadence/core.ts` — `buildCadencePeriods()` already computes period end dates
- `app/api/companies/[id]/route.ts` — PATCH handler should auto-set `next_cycle_due` when cadence fields change
- `app/api/cron/cycle-completion/route.ts` — cron should update `next_cycle_due` after cycle completes

---

*Add new items below as they are discovered during testing.*
