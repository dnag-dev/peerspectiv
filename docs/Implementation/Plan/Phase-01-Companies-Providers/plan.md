# Phase 1: Companies, Providers & Data Model

**Size: M** | **~22 test cases** | **Pre-requisites: None**

## Goal
Establish the organizational data model: companies (clients), their providers, clinics, cadence configuration, and client profile. This is the foundation everything else builds on.

## Test Cases

| ID | What | Personas | Type |
|----|------|----------|------|
| SA-032 | Companies list page loads with all columns | SA | Verify |
| SA-033 | Add new company (onboard client) | SA | Verify |
| SA-034 | Generated client login works | SA, Client | Verify |
| SA-035 | Edit company name and main contact | SA | Verify |
| SA-036 | Generate client invoice | SA | Verify |
| SA-037 | Invoice math: changing price updates total | SA | Verify |
| SA-037B | Invoice math: changing count updates total | SA | Verify |
| SA-038 | Add doctor to company | SA | Verify |
| SA-039 | Bulk upload doctors via CSV | SA | Verify |
| SA-040 | Add location to company | SA | Verify |
| SA-041 | Remove company (no active reviews) | SA | Verify |
| SA-042 | Cannot remove company with active reviews | SA | Verify |
| SA-063A | Review Cadence config — Quarterly with FY start | SA | **Done** |
| SA-063B | Review Cadence config — Monthly with FY start | SA | **Done** |
| SA-063C | Review Cadence config — Custom multi-month | SA | **Done** |
| SA-063F | Review Cadence blocks invalid combinations | SA | Verify |
| CL-021 | Client profile page loads with all sections | Client | Verify |
| CL-022 | Update practice name and contact email | Client | Verify |
| CL-023 | Upload avatar | Client | Verify |
| CL-024 | Reset own password | Client | Verify |
| CL-025 | Add doctor from profile | Client | Verify |
| CL-026 | Add location from profile | Client | Verify |

## Key Files
- `app/(dashboard)/companies/` — list + detail pages
- `app/api/companies/` — CRUD + cadence-periods + pricing routes
- `app/api/providers/` — CRUD + bulk-create + import
- `components/companies/` — all company components
- `lib/cadence/core.ts` — cadence period calculation (done)
- `app/(client)/portal/profile/` — client profile page

## What's Done
- Review Cadence config (SA-063A/B/C) with tests — implemented this session
- Companies list + detail page with providers, pricing, locations, cadence sections
- Company PATCH API with cadence fields whitelisted

## What Needs Work
- Verify all existing features against test case specs
- SA-063F: validation for invalid cadence combinations (0-length, >12 months)
- Client profile sections verification

## Unlocks
Companies + providers exist for batch upload. Client portal has data.
