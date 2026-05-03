import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const OUT  = './screenshots/pulse-v2';

interface Target { folder: 'admin' | 'peer' | 'cmo' | 'auth'; url: string; }

const PERSONAS = {
  admin:    { email: 'admin@peerspectiv.com',     name: 'Ashton Williams',     landing: '/dashboard' },
  peer: { email: 'rjohnson@peerspectiv.com',  name: 'Dr. Richard Johnson', landing: '/peer/portal' },
  cmo:      { email: 'kelli@horizonhealth.org',   name: 'Kelli Ramirez',       landing: '/portal' },
};

const targets: Target[] = [
  { folder: 'auth',    url: '/login' },
  { folder: 'admin',   url: '/dashboard' },
  { folder: 'admin',   url: '/companies' },
  { folder: 'admin',   url: '/batches' },
  { folder: 'admin',   url: '/assign' },
  { folder: 'admin',   url: '/peers' },
  { folder: 'admin',   url: '/payouts' },
  { folder: 'admin',   url: '/reports' },
  { folder: 'admin',   url: '/command' },
  { folder: 'admin',   url: '/prospects' },
  { folder: 'peer',url: '/peer/portal' },
  { folder: 'peer',url: '/peer/earnings' },
  { folder: 'cmo',     url: '/portal' },
  { folder: 'cmo',     url: '/portal/reviews' },
  { folder: 'cmo',     url: '/portal/inprogress' },
  { folder: 'cmo',     url: '/portal/overdue' },
  { folder: 'cmo',     url: '/portal/submit' },
  { folder: 'cmo',     url: '/portal/feedback' },
  { folder: 'cmo',     url: '/portal/quality' },
  { folder: 'cmo',     url: '/portal/trends' },
  { folder: 'cmo',     url: '/portal/providers' },
  { folder: 'cmo',     url: '/portal/export' },
];

(async () => {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  // Bypass site_gate for all
  const url = new URL(BASE);
  await ctx.addCookies([
    { name: 'site_gate', value: '1', domain: url.hostname, path: '/' },
  ]);

  const page = await ctx.newPage();

  let ok = 0;
  let fail = 0;
  for (const t of targets) {
    // Set persona cookie before each navigation
    if (t.folder !== 'auth') {
      const persona = PERSONAS[t.folder];
      const value = JSON.stringify({ role: t.folder === 'cmo' ? 'client' : t.folder, ...persona });
      await ctx.addCookies([
        { name: 'demo_user', value, domain: url.hostname, path: '/' },
      ]);
    } else {
      // Clear persona for /login screenshot
      await ctx.clearCookies();
      await ctx.addCookies([
        { name: 'site_gate', value: '1', domain: url.hostname, path: '/' },
      ]);
    }

    const safe = t.url.replace(/[^a-z0-9]/gi, '_').replace(/^_/, '');
    const file = `${OUT}/${t.folder}__${safe || 'root'}.png`;
    try {
      await page.goto(BASE + t.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForLoadState('load', { timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(1500);
      await page.screenshot({ path: file, fullPage: true });
      console.log('✓', t.folder, t.url);
      ok++;
    } catch (e) {
      console.log('✗', t.folder, t.url, (e as Error).message.split('\n')[0]);
      fail++;
    }
  }
  await browser.close();
  console.log(`\n${ok} captured, ${fail} failed`);
})();
