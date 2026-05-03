# Deferred / explicitly out-of-scope features

These items are documented as future work, not in the current spec scope.

## Geographical Map View (NR-014..017)
**Scope:** Map view of providers/clinics/cases by geography.
**Why deferred:** Requires chart-level location extraction pipeline + Mapbox/Leaflet integration + DB columns for lat/long on clinics/providers.
**What unblocks it:** Phase 10+ once clinic geocoding service is in place.

## UpToDate Integration (NR-004)
**Scope:** Reference UpToDate clinical guidelines from corrective action plans.
**Why deferred:** Requires UpToDate licensing agreement + API access.
**What unblocks it:** Sales conversation with UpToDate; once API credentials available, integrate via lib/integrations/uptodate.ts.

## ADP/ACH Payment Integration (SA-079)
**Scope:** Direct payment to peers via ADP merchant account.
**Why deferred:** Requires merchant account setup + compliance review.
**What unblocks it:** ADP onboarding complete; integrate via Aautipay (already partially wired) or direct ADP webhook.

## AI Trend Search (SA-130)
**Scope:** "Show me trend in documentation completeness over 4 quarters" natural-language queries.
**Why deferred:** Requires ≥2 quarters of historical data + ash tool-use registry (Phase 8.1) extended with trend-analysis tools.
**What unblocks it:** After 6 months of production data; Phase 9.

## /portal/reviews?risk=... row filter
**Scope:** Filter reviews list by risk tier (high/medium/low).
**Why deferred:** Requires risk-tier per row in the query; current page accepts the URL param but doesn't filter.
**What unblocks it:** Add risk_tier column to review_results based on overall_score + deficiency count, then filter in ReviewsTable query.

## /cases pagination beyond 500 rows
**Scope:** Cursor-based pagination on the admin /cases index.
**Why deferred:** No production company has >500 active cases yet.
**What unblocks it:** When any company exceeds 400 active cases, switch to cursor pagination.
