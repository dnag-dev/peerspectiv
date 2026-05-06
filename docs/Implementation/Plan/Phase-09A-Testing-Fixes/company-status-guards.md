# Company Status Guards

**Type:** Enhancement | **Status:** TODO | **Priority:** High

## Requirement
Only Active companies should allow operational activities. Setup activities (providers, forms) allowed during Draft/Contract phases.

## Permission Matrix

| Operation | Draft | Contract Sent | Contract Signed | Active | Archived |
|-----------|-------|---------------|-----------------|--------|----------|
| Edit company details | Yes | Yes | Yes | Yes | No |
| Add providers/doctors | Yes | Yes | Yes | Yes | No |
| Create forms | Yes | Yes | Yes | Yes | No |
| Upload batches | No | No | No | **Yes** | No |
| Assign cases | No | No | No | **Yes** | No |
| Generate invoices | No | No | No | **Yes** | No |
| Generate reports | No | No | No | **Yes** | No |
| Client portal access | No | No | No | **Yes** | No |

## Files to Modify
- `app/api/batches/route.ts` — POST: check company status = active
- `app/api/assign/suggest/route.ts` — check company status
- `app/api/assign/approve/route.ts` — check company status
- `app/api/invoices/generate/route.ts` — check company status
- `app/api/reports/generate/[type]/route.ts` — check company status
- `app/api/reports/download-all/route.ts` — check company status
