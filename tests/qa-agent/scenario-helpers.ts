/**
 * Common page-level helpers shared across scenarios.
 */
import type { BrowserContext, Page } from '@playwright/test';
import { IssueLogger, shotPath } from './issue-logger';
import { BASE_URL } from './config';

export async function newInstrumentedPage(context: BrowserContext, logger: IssueLogger): Promise<Page> {
  const page = await context.newPage();
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Filter common noise
      if (/Warning: validateDOMNesting/.test(text)) return;
      if (/Download the React DevTools/.test(text)) return;
      logger.attachConsoleError(text.slice(0, 500));
    }
  });
  page.on('pageerror', (err) => logger.attachConsoleError(`PAGEERROR: ${err.message}`));
  page.on('response', (resp) => {
    const url = resp.url();
    const status = resp.status();
    if (status >= 500) {
      logger.attachNetworkFailure(`${status} ${resp.request().method()} ${url}`);
    } else if (status === 404 && url.includes('/api/')) {
      logger.attachNetworkFailure(`${status} ${resp.request().method()} ${url}`);
    }
  });
  return page;
}

export async function safeGoto(page: Page, path: string): Promise<{ status: number; finalUrl: string }> {
  try {
    const resp = await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    return { status: resp?.status() || 0, finalUrl: page.url() };
  } catch (e: any) {
    return { status: 0, finalUrl: page.url() };
  }
}

export async function snap(page: Page, scenario: string, label: string): Promise<string | undefined> {
  try {
    const p = shotPath(scenario, label);
    await page.screenshot({ path: p, fullPage: false });
    return p;
  } catch {
    return undefined;
  }
}

export async function detectVisualGremlins(page: Page): Promise<string[]> {
  const gremlins: string[] = [];
  try {
    const text = await page.locator('body').innerText({ timeout: 3000 });
    if (/\$NaN|NaN%|NaN\b/.test(text)) gremlins.push('NaN found in rendered text');
    if (/1\/1\/1970|Jan 1, 1970|Dec 31, 1969/.test(text)) gremlins.push('epoch-zero date rendered');
    if (/\bundefined\b/.test(text)) gremlins.push('literal "undefined" rendered');
    if (/\[object Object\]/.test(text)) gremlins.push('"[object Object]" rendered');
  } catch { /* page might be navigating */ }
  return gremlins;
}

// ─── Deep-driver helpers ──────────────────────────────────────────────────────

export async function settle(page: Page, ms = 600): Promise<void> {
  try { await page.waitForLoadState('networkidle', { timeout: 8000 }); } catch {}
  await page.waitForTimeout(ms);
}

export async function clickByText(page: Page, label: string | RegExp, opts: { role?: 'button' | 'link' | 'tab' | 'menuitem' } = {}): Promise<boolean> {
  const role = opts.role || 'button';
  try {
    const el = page.getByRole(role as any, { name: label as any }).first();
    if (await el.isVisible({ timeout: 2000 })) {
      await el.click({ timeout: 5000 });
      return true;
    }
  } catch {}
  try {
    const el = page.getByText(label as any, { exact: false }).first();
    if (await el.isVisible({ timeout: 1500 })) { await el.click({ timeout: 5000 }); return true; }
  } catch {}
  return false;
}

export async function exists(page: Page, sel: string, timeout = 2000): Promise<boolean> {
  try { return await page.locator(sel).first().isVisible({ timeout }); } catch { return false; }
}

export async function waitForApi(
  page: Page,
  pattern: RegExp,
  trigger: () => Promise<void>,
  timeout = 15000,
): Promise<{ status: number; url: string; body?: any } | null> {
  const respPromise = page.waitForResponse((r) => pattern.test(r.url()), { timeout }).catch(() => null);
  await trigger();
  const resp = await respPromise;
  if (!resp) return null;
  let body: any = undefined;
  try { body = await resp.json(); } catch { try { body = await resp.text(); } catch {} }
  return { status: resp.status(), url: resp.url(), body };
}

export async function downloadAndCheckPdf(
  page: Page,
  trigger: () => Promise<void>,
): Promise<{ ok: boolean; size: number; isPdf: boolean; reason?: string }> {
  const dlPromise = page.waitForEvent('download', { timeout: 20000 }).catch(() => null);
  await trigger();
  const dl = await dlPromise;
  if (!dl) return { ok: false, size: 0, isPdf: false, reason: 'no download event' };
  const fs = await import('fs');
  const path = await import('path');
  const tmp = path.join('/tmp', `qa-dl-${Date.now()}-${Math.random().toString(36).slice(2)}.bin`);
  await dl.saveAs(tmp);
  const buf = fs.readFileSync(tmp);
  const head = buf.slice(0, 5).toString('ascii');
  const isPdf = head.startsWith('%PDF-');
  const size = buf.byteLength;
  try { fs.unlinkSync(tmp); } catch {}
  return { ok: isPdf && size >= 1024, size, isPdf };
}

/**
 * Generic "find a button by accessible name and click it". Tries multiple
 * resolution strategies in order so we degrade gracefully when testids are
 * missing.
 */
export async function tryClick(page: Page, candidates: Array<string | RegExp>, timeout = 1500): Promise<string | null> {
  for (const c of candidates) {
    // Try testid form
    if (typeof c === 'string' && c.startsWith('[')) {
      const el = page.locator(c).first();
      if (await el.isVisible({ timeout }).catch(() => false)) {
        await el.click().catch(() => {});
        return c;
      }
      continue;
    }
    // Try role=button
    try {
      const btn = page.getByRole('button', { name: c as any }).first();
      if (await btn.isVisible({ timeout }).catch(() => false)) { await btn.click(); return `button:${c}`; }
    } catch {}
    // Try role=link
    try {
      const lnk = page.getByRole('link', { name: c as any }).first();
      if (await lnk.isVisible({ timeout }).catch(() => false)) { await lnk.click(); return `link:${c}`; }
    } catch {}
    // Try plain text
    try {
      const tx = page.getByText(c as any, { exact: false }).first();
      if (await tx.isVisible({ timeout }).catch(() => false)) { await tx.click(); return `text:${c}`; }
    } catch {}
  }
  return null;
}

export async function getBodyText(page: Page): Promise<string> {
  try { return await page.locator('body').innerText({ timeout: 3000 }); } catch { return ''; }
}

export async function loadOk(page: Page, path: string): Promise<{ status: number; url: string; bodyText: string }> {
  const r = await safeGoto(page, path);
  await settle(page, 800);
  const bodyText = await getBodyText(page);
  return { status: r.status, url: r.finalUrl, bodyText };
}
