# Ashton's Demo — 6-step Walkthrough

Pre-flight: boot dev with `NEXT_PUBLIC_DEMO_MODE=1 E2E_AUTH_BYPASS=1 npm run dev`
after running `node scripts/reseed-real-data.mjs` (Phase 8.6 extends seed with
~225 cases + pending_credentialing/license_expired peers so every dashboard
bucket has data).

1. **Login as Admin** → `/dashboard`. Show the pipeline + drill-down on past-due.
   Fix one case via Reassign.
2. **Login as Client (Hunter)** → `/portal`. Show the CMO dashboard + drill into
   a specialty. Download Quality Certificate from `/portal/quality`.
3. **Login as Peer (Dr. Johnson)** → `/peer/portal`. Show the queue + open a
   case with AI prefill + the system attestation block + the Return Case flow.
4. **Login as Credentialer (Renée)** → `/credentialing`. Show the 3 buckets +
   credential a peer + earnings tab.
5. **Back to Admin** → show `/forms` (with AI Draft button), `/tags` (cadence +
   global), and an AI-drafted form.
6. **Show Ash** answering an org-level question (e.g. "How many overdue
   cases?") with `run_sql` via tool-use, then a typed-tool example like
   "Which peers expire next week?" calling `list_expiring_peers` directly.

## Pre-generated reports for Hunter Health (Phase 8.6)

Once the seed is rerun, generate the four PDFs once and stash the URLs here so
the demo can show them in 30 seconds without waiting for live generation:

```
POST /api/reports/download-all
{
  "company_id": "<Hunter Health UUID>",
  "cadence_period_label": "Q4 2025",
  "range_start": "2025-10-01",
  "range_end":   "2025-12-31"
}
```

Add the resulting ZIP URL here after the first run:

- Hunter Health Q4 2025 ZIP: _TODO — paste URL after running_

Individual report endpoints (also useful for the walkthrough):

- Quality Certificate: `GET /api/reports/quality-certificate?company_id=…&period=Q4-2025`
- Question Analytics:   `POST /api/reports/generate/question-analytics`
- Specialty Highlights: `POST /api/reports/generate/specialty-highlights`
- Provider Highlights:  `POST /api/reports/generate/provider-highlights`

## Phase 8 polish to demo

- Per-portal Ash quick-action prompts (admin / client / peer / credentialer) —
  see "What's the default answer for question 5?" in `/peer/*` vs "Pipeline
  summary" in `/dashboard`.
- Sidebar collapse state persists across reload (`peerspectiv.sidebar.collapsed`).
- 2FA management link on `/peer/profile` and `/portal/profile` (disabled
  tooltip in demo mode where Clerk isn't configured).
- New per-cadence email-bundle endpoint at `POST /api/reports/email` honoring
  `companies.delivery_method` (portal / secure_email / both).
