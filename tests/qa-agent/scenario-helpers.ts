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
