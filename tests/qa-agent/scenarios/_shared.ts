/**
 * Helper used by every scenario module. Wraps the navigate-and-check pattern
 * so each scenario file stays small and readable.
 */
import type { BrowserContext } from '@playwright/test';
import { IssueLogger } from '../issue-logger';
import { loginAs } from '../personas';
import { Role } from '../config';
import { detectVisualGremlins, newInstrumentedPage, safeGoto, snap } from '../scenario-helpers';

export interface ScenarioCtx {
  logger: IssueLogger;
  browser: any; // playwright Browser
}

export async function withPage(
  ctx: ScenarioCtx,
  role: Role | null,
  fn: (page: any, context: BrowserContext) => Promise<void>,
): Promise<void> {
  const context = await ctx.browser.newContext();
  try {
    if (role) await loginAs(context, role);
    const page = await newInstrumentedPage(context, ctx.logger);
    await fn(page, context);
  } finally {
    await context.close().catch(() => {});
  }
}

export interface PageCheck {
  name: string;
  path: string;
  spec: string;
  persona: any;
  expectStatus?: number[];
  /** Substrings that should appear in body text. Each missing match logs a high issue. */
  expectsText?: string[];
  /** Substrings that, if found, should NOT be there (forbidden text). */
  forbidsText?: string[];
  /** If provided, runs after navigation for custom assertions. */
  extra?: (page: any, logger: import('../issue-logger').IssueLogger) => Promise<void>;
}

export async function checkPage(ctx: ScenarioCtx, role: Role | null, c: PageCheck) {
  const { logger } = ctx;
  await withPage(ctx, role, async (page) => {
    logger.resetHarvest();
    const { status, finalUrl } = await safeGoto(page, c.path);
    if (status === 404) {
      logger.log({ spec_section: c.spec, severity: 'medium', category: 'not-yet-built', title: `${c.path} returned 404`, description: 'Route not yet built or renamed.', url: finalUrl, screenshot: await snap(page, c.name, '404') });
      return;
    }
    if (status >= 500) {
      logger.log({ spec_section: c.spec, severity: 'critical', category: 'functional', title: `${c.path} returned ${status}`, description: 'Server error on page load.', url: finalUrl, screenshot: await snap(page, c.name, '5xx') });
      return;
    }
    await page.waitForTimeout(1500);
    const text = await page.locator('body').innerText().catch(() => '');
    if (c.expectsText) {
      for (const needle of c.expectsText) {
        if (!new RegExp(needle, 'i').test(text)) {
          logger.log({ spec_section: c.spec, severity: 'medium', category: 'functional', title: `${c.path} missing expected content "${needle}"`, description: `Expected substring not found.`, url: finalUrl, screenshot: await snap(page, c.name, 'missing') });
        }
      }
    }
    if (c.forbidsText) {
      for (const needle of c.forbidsText) {
        if (new RegExp(needle, 'i').test(text)) {
          logger.log({ spec_section: c.spec, severity: 'medium', category: 'functional', title: `${c.path} contains forbidden content "${needle}"`, description: `Forbidden substring found.`, url: finalUrl, screenshot: await snap(page, c.name, 'forbidden') });
        }
      }
    }
    const gremlins = await detectVisualGremlins(page);
    if (gremlins.length) {
      logger.log({ spec_section: c.spec, severity: 'medium', category: 'visual', title: `Visual gremlin on ${c.path}: ${gremlins[0]}`, description: gremlins.join('; '), url: finalUrl, screenshot: await snap(page, c.name, 'gremlin') });
    }
    if (c.extra) {
      try {
        await c.extra(page, logger);
      } catch (e: any) {
        logger.log({ spec_section: c.spec, severity: 'low', category: 'functional', title: `extra check threw on ${c.path}`, description: e?.message || String(e), url: finalUrl });
      }
    }
  });
}

/**
 * Smoke-check a page: navigate, screenshot, scan for visual gremlins,
 * verify it didn't 404/500. Logs issues automatically.
 */
export async function smokeCheck(
  ctx: ScenarioCtx,
  role: Role | null,
  opts: { name: string; path: string; spec: string; persona: any; expectStatus?: number[] },
): Promise<void> {
  const { logger } = ctx;
  await withPage(ctx, role, async (page) => {
    logger.resetHarvest();
    const { status, finalUrl } = await safeGoto(page, opts.path);
    const ok = (opts.expectStatus || [200, 0]).includes(status) || status === 0; // 0 = SPA nav
    if (!ok && status === 404) {
      const ss = await snap(page, opts.name, '404');
      logger.log({
        spec_section: opts.spec,
        severity: 'medium',
        category: 'not-yet-built',
        title: `${opts.path} returned 404`,
        description: `Page not yet built or route renamed.`,
        url: finalUrl,
        screenshot: ss,
      });
      return;
    }
    if (status >= 500) {
      const ss = await snap(page, opts.name, '5xx');
      logger.log({
        spec_section: opts.spec,
        severity: 'critical',
        category: 'functional',
        title: `${opts.path} returned ${status}`,
        description: 'Server error on page load.',
        url: finalUrl,
        screenshot: ss,
      });
      return;
    }
    // Wait for render so dynamic data lands
    await page.waitForTimeout(1500);
    const gremlins = await detectVisualGremlins(page);
    if (gremlins.length) {
      const ss = await snap(page, opts.name, 'gremlin');
      logger.log({
        spec_section: opts.spec,
        severity: 'medium',
        category: 'visual',
        title: `Visual gremlin on ${opts.path}: ${gremlins[0]}`,
        description: gremlins.join('; '),
        url: finalUrl,
        screenshot: ss,
      });
    }
  });
}
