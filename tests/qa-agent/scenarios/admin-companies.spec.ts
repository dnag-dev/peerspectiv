import { smokeCheck, withPage, ScenarioCtx } from './_shared';
import { snap, detectVisualGremlins, safeGoto } from '../scenario-helpers';

export const meta = { name: 'admin-companies', persona: 'admin' as const };

export async function run(ctx: ScenarioCtx) {
  await smokeCheck(ctx, 'admin', { name: meta.name, path: '/companies', spec: 'A1', persona: 'admin' });

  await withPage(ctx, 'admin', async (page) => {
    ctx.logger.resetHarvest();
    await safeGoto(page, '/companies');
    await page.waitForTimeout(1500);
    // Check for table or list of companies
    const bodyText = await page.locator('body').innerText().catch(() => '');
    if (!/compan/i.test(bodyText)) {
      ctx.logger.log({
        spec_section: 'A1',
        severity: 'high',
        category: 'functional',
        title: '/companies page does not render company-related content',
        description: 'Expected at least the word "compan" on the companies index.',
        screenshot: await snap(page, meta.name, 'no-content'),
        url: page.url(),
      });
    }
    // Look for "Add company" / "New" button
    const hasAdd = await page.getByRole('button', { name: /add|new|create/i }).first().isVisible().catch(() => false);
    if (!hasAdd) {
      ctx.logger.log({
        spec_section: 'A1',
        severity: 'low',
        category: 'functional',
        title: 'No visible "Add/New/Create" button on /companies',
        description: 'Could not find an action button to add a new company.',
        url: page.url(),
      });
    }
    const gremlins = await detectVisualGremlins(page);
    if (gremlins.length) {
      ctx.logger.log({
        spec_section: 'A1',
        severity: 'medium',
        category: 'visual',
        title: `Visual gremlin on /companies: ${gremlins[0]}`,
        description: gremlins.join('; '),
        screenshot: await snap(page, meta.name, 'gremlin'),
        url: page.url(),
      });
    }
  });
}
