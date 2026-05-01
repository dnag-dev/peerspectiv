# Deploy Notes — Apex Flip (Marketing on www, App on app.)

## Routing model

| Host                 | Behavior                                              |
| -------------------- | ----------------------------------------------------- |
| `peerspectiv.ai`     | 308 → `https://www.peerspectiv.ai` (apex → www)       |
| `www.peerspectiv.ai` | Marketing site (rewritten internally to `/site/*`)    |
| `app.peerspectiv.ai` | App (existing routes pass-through, gate/Clerk intact) |

## Safety net
Any request to apex or www whose first path segment is a known app segment
(see `APP_PATHS` in `middleware.ts` — built from `app/(dashboard)`,
`app/(client)`, `app/(auth)`, `app/gate`) gets 308'd to
`app.peerspectiv.ai` with the same path. Protects old bookmarks during the
cutover (e.g. `peerspectiv.ai/dashboard` → `app.peerspectiv.ai/dashboard`).

## Pass-through APIs (work on every host)
- `/api/leads` — marketing lead form
- `/api/cron/*` — Vercel cron jobs
- `/api/health` — health check
- `/api/webhooks/*` — third-party webhooks (aautipay, docusign)

All other `/api/*` requests on www get 308'd to `app.peerspectiv.ai`.

## DNS (registrar / Cloudflare — manual)
| Record               | Type  | Target                  |
| -------------------- | ----- | ----------------------- |
| `peerspectiv.ai`     | A     | `76.76.21.21` (Vercel)  |
| `www.peerspectiv.ai` | CNAME | `cname.vercel-dns.com`  |
| `app.peerspectiv.ai` | CNAME | `cname.vercel-dns.com`  ← NEW |

## Vercel project config
1. Domains → Add `app.peerspectiv.ai` (verify cert issued).
2. `www.peerspectiv.ai` is primary (already attached).
3. `peerspectiv.ai` stays attached; redirect handled in middleware
   AND `vercel.json` (belt + suspenders).

## Cutover sequence
1. Add `app.peerspectiv.ai` DNS CNAME at registrar.
2. Add `app.peerspectiv.ai` in Vercel (verify cert).
3. Test `https://app.peerspectiv.ai/` in incognito — confirm app loads.
4. Deploy this branch: `vercel --prod`.
5. Test `https://peerspectiv.ai/` — should 308 to `https://www.peerspectiv.ai`.
6. Test `https://peerspectiv.ai/dashboard` — should 308 to
   `https://app.peerspectiv.ai/dashboard`.
7. Run `npm run smoke`.
8. Notify Tracy, Ashton, and internal users of the new app URL.

## Local dev (lvh.me — no /etc/hosts edits)
```
npm run dev -- -H 0.0.0.0
```

| URL                                       | Expected                                                  |
| ----------------------------------------- | --------------------------------------------------------- |
| `http://www.peerspectiv.lvh.me:3000/`     | Marketing home (200)                                      |
| `http://peerspectiv.lvh.me:3000/`         | 307 → `http://www.peerspectiv.lvh.me:3000`                |
| `http://peerspectiv.lvh.me:3000/dashboard`| 307 → `http://app.peerspectiv.lvh.me:3000/dashboard`      |
| `http://app.peerspectiv.lvh.me:3000/`     | App (gate / dashboard / login depending on auth state)    |
| `http://localhost:3000/`                  | App (legacy fallback, treated as APP_HOST)                |

Then:
```
SMOKE_BASE=http://www.peerspectiv.lvh.me:3000 \
SMOKE_APEX=http://peerspectiv.lvh.me:3000 \
SMOKE_APP=http://app.peerspectiv.lvh.me:3000 \
npm run smoke
```

## Brand
- Marketing wordmark: **Peerspectiv** (top-bar uses `WordmarkPerspectiv`).
- App wordmark: **Peerspectiv** — unchanged. No app routes, copy, or styles
  were touched by this change.
