import { withPage, ScenarioCtx } from './_shared';
import { safeGoto, snap, detectVisualGremlins } from '../scenario-helpers';

export const meta = { name: 'admin-reviewers', persona: 'admin' as const };

export async function run(ctx: ScenarioCtx) {
  await withPage(ctx, 'admin', async (page) => {
    ctx.logger.resetHarvest();
    const { status } = await safeGoto(page, '/reviewers');
    await page.waitForTimeout(1500);
    if (status === 404) {
      ctx.logger.log({ spec_section: 'B1/B4', severity: 'medium', category: 'not-yet-built', title: '/reviewers route 404', description: 'Reviewer admin page missing.', url: page.url() });
      return;
    }
    const txt = await page.locator('body').innerText().catch(() => '');
    if (!/reviewer/i.test(txt)) {
      ctx.logger.log({ spec_section: 'B1/B4', severity: 'high', category: 'functional', title: '/reviewers does not render reviewer content', description: 'Expected reviewer table/list per B1/B4.', url: page.url(), screenshot: await snap(page, meta.name, 'empty') });
    }
    if (!/specialt|max.*load|caseload/i.test(txt)) {
      ctx.logger.log({ spec_section: 'B1/B4', severity: 'medium', category: 'functional', title: '/reviewers missing multi-specialty or max-load surfaces', description: 'B1 (multi-specialty) and B4 (caseload cap) should be visible/manageable here.', url: page.url() });
    }
    const gremlins = await detectVisualGremlins(page);
    if (gremlins.length) {
      ctx.logger.log({ spec_section: 'B1', severity: 'medium', category: 'visual', title: `Visual gremlin on /reviewers: ${gremlins[0]}`, description: gremlins.join('; '), url: page.url(), screenshot: await snap(page, meta.name, 'gremlin') });
    }
  });
}
