# Auto-calculate next_cycle_due from Review Cadence

**Type:** Enhancement | **Status:** TODO | **Priority:** Medium

## Current Behavior
- `companies.next_cycle_due` is a manually-set date field
- "Upcoming Cycles" on admin dashboard queries companies where this date falls within next 30 days
- Period sequence on company detail page shows calculated periods regardless of whether reviews exist

## Required Behavior

### 1. Auto-set next_cycle_due on cadence config save
When admin saves cadence config (frequency, FY start, custom months):
- Compute the current period using `buildCadencePeriods()`
- Set `next_cycle_due` = **next period's start date** (not current period end)
- Example: Quarterly FY-Jan, today = May 2026, current = Q2 (Apr-Jun) → `next_cycle_due = 2026-07-01` (Q3 start)

### 2. Auto-set next_cycle_due on cadence CHANGE
If admin changes cadence (e.g., quarterly → monthly, or different FY start month):
- Recalculate immediately based on new config
- Update `next_cycle_due` to reflect the new cadence's next period start
- Do NOT wait for the daily cron

### 3. Daily cron job to keep next_cycle_due current
- Runs daily for all active companies with cadence config
- Computes current + next period from `buildCadencePeriods()`
- Sets `next_cycle_due` = next period start date
- Creates cadence tags (find-or-create) for both current AND next period

### 4. Period sequence on company detail — only show periods with reviews
- The period sequence grid on the company edit page should ONLY show periods that have actual batches or reviews
- Empty calculated periods should NOT appear
- Query batches/review_cases for the company and show only periods that have data

## Files to Modify
- `app/api/companies/[id]/route.ts` — recalculate `next_cycle_due` when cadence fields are PATCHed
- `components/companies/CadenceSection.tsx` — period sequence shows only periods with data
- `app/api/cron/cycle-completion/route.ts` — daily cron updates `next_cycle_due` + creates tags
- `lib/cadence/core.ts` — add helper to get next period start date
