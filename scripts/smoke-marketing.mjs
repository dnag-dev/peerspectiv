#!/usr/bin/env node
/**
 * Smoke test for the apex/www/app routing split.
 *
 * Defaults run against production. Override with env vars to point at a
 * preview or local lvh.me dev environment:
 *
 *   SMOKE_BASE=http://www.peerspectiv.lvh.me:3000 \
 *   SMOKE_APEX=http://peerspectiv.lvh.me:3000 \
 *   SMOKE_APP=http://app.peerspectiv.lvh.me:3000 \
 *   node scripts/smoke-marketing.mjs
 */

const BASE = process.env.SMOKE_BASE ?? "https://www.peerspectiv.ai";
const APEX = process.env.SMOKE_APEX ?? "https://peerspectiv.ai";
const APP = process.env.SMOKE_APP ?? "https://app.peerspectiv.ai";

const checks = [
  // www: marketing pages return 200
  { url: `${BASE}/`, expect: 200 },
  { url: `${BASE}/platform`, expect: 200 },
  { url: `${BASE}/fqhc`, expect: 200 },
  { url: `${BASE}/firms`, expect: 200 },
  { url: `${BASE}/pricing`, expect: 200 },
  { url: `${BASE}/security`, expect: 200 },
  { url: `${BASE}/company`, expect: 200 },
  { url: `${BASE}/contact`, expect: 200 },

  // apex: 308 to www
  { url: `${APEX}/`, expect: [301, 308], followRedirect: false },

  // apex: app path → 308 to app.*
  { url: `${APEX}/dashboard`, expect: [301, 308], followRedirect: false },

  // www: app path → 308 to app.*
  { url: `${BASE}/dashboard`, expect: [301, 308], followRedirect: false },

  // app: home returns something live (200 / 307 to /gate / 308)
  { url: `${APP}/`, expect: [200, 307, 308] },

  // Phase 1.2 — verify legacy /reviewer/* paths still 301 redirect
  { url: `${APP}/reviewer/portal`, expect: [301], followRedirect: false },
];

let failed = 0;
for (const c of checks) {
  try {
    const res = await fetch(c.url, {
      redirect: c.followRedirect === false ? "manual" : "follow",
    });
    const expected = Array.isArray(c.expect) ? c.expect : [c.expect];
    const ok = expected.includes(res.status);
    const loc = res.headers.get("location");
    console.log(
      `${ok ? "✓" : "✗"} ${c.url} → ${res.status}${
        loc ? ` (location: ${loc})` : ""
      } [expected ${expected.join(" or ")}]`
    );
    if (!ok) failed++;
  } catch (e) {
    console.error(`✗ ${c.url} → ${e.message}`);
    failed++;
  }
}

if (failed) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log("\nAll smoke checks passed.");
