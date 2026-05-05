# Phase 7: Reports, Invoicing & Client Portal

**Size: L** | **~65 test cases** | **Pre-requisites: Phase 6**

## Goal
Verify all 5 canonical report types, peer scorecard, download-all ZIP, secure email delivery, invoice generation with per-specialty pricing, and the complete client portal (dashboard, reviews, reports, files, invoices, feedback). This is the output layer — everything produced by the platform flows through here.

## Test Cases — Reports (SA)

| ID | What | Type |
|----|------|------|
| SA-012 | Reports page loads | Verify |
| SA-013 | Provider Highlights report (baseline) | Verify |
| SA-013A | Per-Provider Review Answers PDF | Verify |
| SA-013B | Question Analytics per specialty | Verify |
| SA-013C | Specialty Highlights | Verify |
| SA-013D | Provider Highlights per cadence period | Verify |
| SA-013E | Quality Certificate (HRSA) | Verify |
| SA-014 | Specialty Highlights (baseline) | Verify |
| SA-015 | Question Analytics (baseline) | Verify |
| SA-016 | Quality Certificate (baseline) | Verify |
| SA-017 | Assignment Results with multi-filter | Verify |
| SA-018 | Export PDF + Excel | Verify |
| SA-019 | Date range validates start <= end | Verify |
| SA-020 | Empty range produces graceful empty report | Verify |
| SA-071 | Provider Highlights numbers match raw data | Verify |
| SA-072 | Specialty Highlights aggregates correctly | Verify |
| SA-093 | Quality Certificate selectable by quarter | Verify |
| SA-094 | Download All ZIP | Enhance |
| SA-095 | Question Analytics descending fail-rate order | Verify |
| SA-096 | Provider Scorecard quarter-over-quarter | Verify |
| SA-096A | Peer Scorecard (6 metrics) | Verify |
| SA-098 | Per-company portal vs email delivery | Verify |
| SA-130 | AI trend search | **Deferred** |
| SA-131 | Download All ZIP with real invoice | Enhance |
| SA-132 | Secure email delivery | Verify |

## Test Cases — Invoicing (SA)

| ID | What | Type |
|----|------|------|
| SA-036 | Generate invoice + price math | Verify |
| SA-037 | Invoice price change updates total | Verify |
| SA-037B | Invoice count change updates total | Verify |
| SA-080 | Invoice count edit + regenerate | Verify |
| SA-081 | Itemized invoice option | Verify |
| SA-106B | Flat rate regression | Verify |
| SA-107 | Add specialty rate | Verify |
| SA-108 | Add multiple specialty rates | Verify |
| SA-109 | Edit specialty rate | Verify |
| SA-110 | Remove specialty rate | Verify |
| SA-111 | Default rate fallback | Verify |
| SA-112 | Negative/zero rate rejected | Verify |
| SA-113 | Per-specialty invoice line items | Verify |
| SA-114 | Invoice total matches manual calc | Verify |
| SA-115 | Rate change non-retroactive | Verify |

## Test Cases — Client Portal

| ID | What | Type |
|----|------|------|
| CL-001 | Client dashboard loads with all widgets | Verify |
| CL-002 | Average score donut correct | Verify |
| CL-003 | Tab switching filters reviews | Verify |
| CL-004 | Score badges color-coded | Verify |
| CL-005 | Recent files widget | Verify |
| CL-006 | Create A Report shortcut | Verify |
| CL-007 | Reviews list (own company only) | Verify |
| CL-008 | Open completed review detail | Verify |
| CL-009 | Generate Provider Highlights | Verify |
| CL-010 | Generate Specialty Highlights | Verify |
| CL-011 | Generate Question Analytics | Verify |
| CL-012 | Download Quality Certificate | Verify |
| CL-029 | Client views/downloads invoices | Verify |
| CL-030 | Email notification for new invoice | Verify |
| CL-031 | Quick snapshot status banner | Verify |
| CL-032 | Compliance by Specialty widget | Verify |
| CL-033 | Risk Distribution widget | Verify |
| CL-034 | Past Due Cases counter | Verify |
| CL-035 | Open Corrective Actions section | Verify |
| CL-036 | AI Trends/Insights panel | Verify |
| CL-037 | Provider list search and filter | Verify |
| CL-038 | Click-through drill-down on every widget (AU-016) | Verify |
| CL-039 | Quarter-over-Quarter score comparison | Verify |
| CL-040 | Provider Scorecard PDF landscape | Verify |
| CL-041 | Download All ZIP of quarterly deliverables | Verify |
| CL-042 | Client feedback widget submits ratings | Verify |

## Key Files
- `lib/reports/data.ts` — report data fetchers
- `lib/reports/persona-guard.ts` — persona visibility matrix
- `lib/reports/types/` — report type definitions
- `app/api/reports/` — all report API routes
- `app/api/invoices/` — invoice generation
- `lib/invoices/generate.ts` — invoice generator
- `app/(client)/portal/` — all client portal pages
- `lib/portal/queries.ts` — client dashboard queries

## What Needs Work
- Verify all 5 report types generate correctly with real data
- Verify persona guard enforcement
- Verify per-specialty invoice line items
- Verify client dashboard widgets with real data
- Enhance Download All ZIP to include real invoice (not stub)

## Unlocks
Chains 5, 6, 7 complete. All output flows operational.
