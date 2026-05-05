# Phase 8: Exceptions

| ID | What | Exception | Reason |
|----|------|-----------|--------|
| SA-031 | Reset peer password from admin | Deferred to Phase 9 | Requires Clerk admin API integration for password management. Same deferral as in Phase 2. |
| SA-077 | Auto-approve reviewer payments at month end | Manual approve only | "Approve all pending" button exists on Payouts page. Automated cron-based auto-approval is a future enhancement. |
| SA-079 | ADP/ACH integration | Uses Aautipay instead | Platform integrates with Aautipay for payouts, not traditional ADP/ACH. This is a vendor decision, not a gap. |
| SA-097 | AI chatbot for admin queries | Deferred | Low priority per product roadmap. |
