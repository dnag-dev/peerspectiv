# Product Roadmap

## Section O — Tiered SaaS offering (phase 2/3, NOT BUILDING NOW)

Three pricing tiers under discussion with Ashton:

- **Essentials** — chart upload + AI peer review only, no human reviewer.
  Capped volume per month.
- **Pro** — Essentials + a single human reviewer pass on flagged cases.
- **White-glove** — current model: full human reviewer panel + Peerspectiv ops.

### Implementation surface (when we build)
- Company-level `tier` enum on `companies` (essentials | pro | white_glove).
- Per-tier feature flags in a new `lib/features.ts` (or extend `lib/settings.ts`).
- "AI-only reviews" mode in the reviewer flow:
  - The AI-prefill toggle from Section F8 lights up.
  - Reviewer step is skipped; reports flow straight from AI analysis → client.
- Volume caps enforced in `app/api/batches/route.ts` POST.
- Billing differentiation in `app/api/invoices/...` (different unit prices per tier).

### Why deferred
Pricing isn't finalized; building before the model is set risks rebuilding
later. Capture in roadmap, revisit Q3.

## Section F8 — AI-prefill premium gating (DOCUMENTED, not built)

Reviewer flow today auto-prefills via `lib/ai/chart-analyzer.ts` for every
case. Once tiering lands, prefill becomes a per-tier (and possibly per-form)
gate. TODO comments are placed in:
- `lib/ai/chart-analyzer.ts`
- `components/reviewer/ReviewForm.tsx`

at the appropriate gate locations.

## Section J4 — UpToDate integration (placeholder)

Real UpToDate API access requires partnership negotiation. For now:
- AI-drafted CAPs (corrective action plans) are auto-generated when
  `review_results.overall_score < 70` OR `deficiencies.length > 0`.
- A small banner on the corrective actions page reads:
  > "Want industry-standard guidelines? Talk to us about UpToDate integration."

This is a sales hook, not a product feature.
