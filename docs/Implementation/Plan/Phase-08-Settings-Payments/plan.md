# Phase 8: Settings, Payments & Remaining

**Size: M** | **~25 test cases** | **Pre-requisites: Phase 7**

## Goal
Verify operational settings, payment automation, peer earnings, and remaining client profile features. These are the configuration and financial plumbing that support the core workflows.

## Test Cases

| ID | What | Personas | Type |
|----|------|----------|------|
| SA-056 | Settings page loads with all sections | SA | Verify |
| SA-057 | Update file expiration hours | SA | Verify |
| SA-058 | Update global pay rate per review | SA | Verify |
| SA-060 | Negative number rejected for file expiration | SA | Verify |
| SA-076 | Configure pay model per peer | SA | Verify |
| SA-077 | Auto-approve reviewer payments at month end | SA | Verify |
| SA-078 | Weekend cutoff rule (last Thursday) | SA | Verify |
| SA-079 | ADP/ACH integration triggers payment file | SA | Verify |
| SA-084 | File retention configurable in days | SA | Verify |
| SA-085 | Files behind firewall after retention | SA | Verify |
| SA-026 | Generate peer earnings report | SA | Verify |
| SA-027 | Earnings excludes incomplete reviews | SA | Verify |
| SA-028 | Mark reviews as paid | SA | Verify |
| SA-029 | Delete/archive peer (no assignments) | SA | Verify |
| SA-030 | Cannot delete peer with active assignments | SA | Verify |
| SA-031 | Reset peer password from admin | SA | Verify |
| CL-021 | Profile page loads with all sections | Client | Verify |
| CL-022 | Update practice name and email | Client | Verify |
| CL-023 | Upload avatar | Client | Verify |
| CL-024 | Reset own password | Client | Verify |
| CL-025 | Add doctor from profile | Client | Verify |
| CL-026 | Add location from profile | Client | Verify |
| CL-027 | Submit support question | Client | Verify |
| CL-028 | Client can view forms (read-only) | Client | Verify |
| SA-097 | AI chatbot for admin queries | SA | **Deferred** |

## Key Files
- `app/(dashboard)/settings/` — settings page (4 tabs)
- `app/api/settings/` — settings API
- `app/api/payouts/` — payout management
- `app/(dashboard)/payouts/` — payouts page
- `app/(client)/portal/profile/` — client profile
- `lib/email/notifications.ts` — email functions

## What Needs Work
- Verify all settings persist and take effect
- Verify payment automation flows
- Verify client profile sections

## Unlocks
All operational settings configured. Payment flows verified.
