# Migrations Tracking

## Active migration sequence
- `001_initial_schema.sql` — bootstrap
- `002_ash_and_corrective.sql` — Ash conversations + corrective actions
- `003_extraction_method.sql` — chart-extraction method tag
- `004_prospect_pipeline.sql` — pipeline stages
- `005_ashton_requests.sql` — first Ashton round (availability, projected completion, feedback)
- `006_reviewer_rates_and_payouts.sql` — payouts table + rate types
- `007_reports_invoices_tags_settings_aautipay.sql` — phase 5
- `008_invoice_number_sequence.sql` — invoice numbering
- `009_post_ashton_review.sql` — post Ashton/Viji review (Apr 28 2026)

## Section L — supabaseAdmin → pure Drizzle migration

The codebase has a `supabaseAdmin` compat shim still in use across older
routes. New code goes straight through Drizzle (`db.select().from(...)`).
This is the punch list for cutting over the rest. **Defer this work** — it
is not part of the post-Ashton-review round.

### Files still using `supabaseAdmin` (run `grep -rln supabaseAdmin app/ lib/` to refresh)

| File                                             | Replacement | Risk   |
| ------------------------------------------------ | ----------- | ------ |
| `app/api/companies/route.ts`                     | `db.select().from(companies)…` | low    |
| `app/api/companies/[id]/route.ts`                | drizzle update / select        | low    |
| `app/api/providers/route.ts`                     | drizzle                         | low    |
| `app/api/batches/route.ts`                       | drizzle (POST does multi-step — wrap in `db.transaction`) | medium |
| `app/api/cases/[id]/route.ts`                    | drizzle                         | low    |
| `app/api/assign/suggest/route.ts`                | drizzle (joins) — already partly migrated | medium |
| `app/api/assign/approve/route.ts`                | drizzle                         | medium |
| `app/api/reviewer/cases/route.ts`                | drizzle                         | low    |
| `app/api/cron/cycle-reminders/route.ts`          | drizzle                         | low    |
| `app/api/cron/reviewer-availability-restore/route.ts` | drizzle                    | low    |
| (re-grep before starting — list above is illustrative) |               |        |

### Recommended order
1. **Read-only route handlers first** (low risk). Each is one `db.select()` call.
2. **Single-table writes** (low risk).
3. **Multi-step writes that need transactions** — wrap in `db.transaction(async (tx) => { … })`.
4. **Remove the shim** (`lib/supabase-admin.ts` or wherever it lives) once nothing imports it.
5. Run the existing Playwright suite at each step; gate on green.

### Notes
- Drizzle's `db` is exported from `lib/db/index.ts` (or `lib/db.ts` — check).
- `schema.ts` is the source of truth for column names. If a migrated route
  picks up a typo, the Drizzle column name needs fixing in `schema.ts` first.
- `db.transaction` requires the caller to be `async` and to return the
  result; don't forget to await.
