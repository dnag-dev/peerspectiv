# Phase 9: Auth & RBAC

**Size: M** | **~18 test cases** | **Pre-requisites: Phases 1-8 complete**

## Goal
Harden authentication and role-based access control. Done last because demo mode login buttons are used throughout development. This phase switches to real Clerk auth, verifies URL protection, cross-tenant isolation, and session management.

## Test Cases

| ID | What | Personas | Type |
|----|------|----------|------|
| AU-001 | Login page loads with correct branding | All | Verify |
| AU-002 | Login with valid Super Admin credentials | SA | Verify |
| AU-003 | Login with valid Client credentials | Client | Verify |
| AU-004 | Login with valid Peer credentials | Peer | Verify |
| AU-005 | Login with invalid password | All | Verify |
| AU-006 | Login with non-existent email | All | Verify |
| AU-007 | Login with empty fields | All | Verify |
| AU-008 | Login with malformed email | All | Verify |
| AU-009 | Remember Me persists session | All | Verify |
| AU-010 | Forgot Password sends reset email | All | Verify |
| AU-011 | Password reset link works | All | Verify |
| AU-012 | Enable 2FA from profile | All | Verify |
| AU-013 | Logout ends session, back button blocked | All | Verify |
| AU-014 | Client URL not accessible to Peer | Peer, Client | Verify |
| AU-015 | Peer URL not accessible to Client | Client, Peer | Verify |
| AU-016 | Every dashboard number drills into contributing items | All | Verify |
| CL-013 | Client cannot see another client's data | Client | Enhance |
| CL-013A | Cross-tenant isolation across all 5 report types | Client | Enhance |

## Key Files
- `middleware.ts` — RBAC routing, host-based routing, no-cache headers
- `app/(auth)/login/page.tsx` — login page
- `app/gate/page.tsx` — pre-login gate
- `app/api/demo/login/route.ts` — demo mode (to be replaced/augmented)
- `lib/db/caller-scope.ts` — caller identity resolution

## What Needs Building
- Cross-tenant isolation enforcement at API level for CL-013A
- Verify all protected routes redirect unauthenticated users
- Verify no-cache headers on all protected pages

## Unlocks
Production-ready auth. All personas authenticated via Clerk.
