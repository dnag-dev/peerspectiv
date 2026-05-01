import { withPage, ScenarioCtx } from './_shared';
import { detectVisualGremlins, safeGoto, snap } from '../scenario-helpers';

export const meta = { name: 'reviewer-case-detail', persona: 'reviewer' as const };
export async function run(ctx: ScenarioCtx) {
  await withPage(ctx, 'reviewer', async (page) => {
    ctx.logger.resetHarvest();
    await safeGoto(page, '/reviewer/portal');
    await page.waitForTimeout(2000);
    const link = page.locator('a[href*="/reviewer/cases/"]').first();
    if (!(await link.isVisible().catch(() => false))) {
      ctx.logger.log({ spec_section: 'F1/F5', severity: 'info', category: 'functional', title: 'No assignable case to drill into', description: 'Reviewer portal had no case links — backend may have no fixtures for this persona.', url: page.url() });
      return;
    }
    await link.click().catch(() => {});
    await page.waitForTimeout(2500);
    const txt = await page.locator('body').innerText().catch(() => '');
    if (!/chart|case|patient|mrn/i.test(txt)) {
      ctx.logger.log({ spec_section: 'F1', severity: 'high', category: 'functional', title: 'Reviewer case detail has no chart/case content', description: 'Expected at least chart/case/MRN labels.', url: page.url(), screenshot: await snap(page, meta.name, 'no-content') });
    }
    if (!/multi|chart 1|chart 2|tab/i.test(txt)) {
      ctx.logger.log({ spec_section: 'F1', severity: 'low', category: 'functional', title: 'Multi-chart tabs not visible (may be single-chart case)', description: 'F1 calls for chart tabs in multi-chart cases.', url: page.url() });
    }
    const gremlins = await detectVisualGremlins(page);
    if (gremlins.length) {
      ctx.logger.log({ spec_section: 'F1', severity: 'medium', category: 'visual', title: `Visual gremlin on case detail: ${gremlins[0]}`, description: gremlins.join('; '), url: page.url(), screenshot: await snap(page, meta.name, 'gremlin') });
    }
  });
}
