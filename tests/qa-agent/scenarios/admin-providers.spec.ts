import { smokeCheck, withPage, ScenarioCtx } from './_shared';
import { safeGoto, snap, detectVisualGremlins } from '../scenario-helpers';

export const meta = { name: 'admin-providers', persona: 'admin' as const };

export async function run(ctx: ScenarioCtx) {
  // Providers is per-company; smoke companies, then drill into first.
  await withPage(ctx, 'admin', async (page) => {
    ctx.logger.resetHarvest();
    await safeGoto(page, '/companies');
    await page.waitForTimeout(1500);
    const firstLink = page.locator('a[href*="/companies/"]').first();
    const hasLink = await firstLink.isVisible().catch(() => false);
    if (!hasLink) {
      ctx.logger.log({
        spec_section: 'A2/A3',
        severity: 'medium',
        category: 'functional',
        title: 'No company link visible on /companies — cannot reach provider list',
        description: 'A1/A2 require drilling into a company to manage providers (CSV bulk import, NPI).',
        url: page.url(),
        screenshot: await snap(page, meta.name, 'no-link'),
      });
      return;
    }
    await firstLink.click().catch(() => {});
    await page.waitForTimeout(1500);
    const text = await page.locator('body').innerText().catch(() => '');
    if (!/provider|npi|specialt/i.test(text)) {
      ctx.logger.log({
        spec_section: 'A2/A3',
        severity: 'medium',
        category: 'functional',
        title: 'Company detail page lacks provider/NPI/specialty content',
        description: 'Expected provider table or import controls per A2/A3.',
        url: page.url(),
        screenshot: await snap(page, meta.name, 'company-detail'),
      });
    }
    const gremlins = await detectVisualGremlins(page);
    if (gremlins.length) {
      ctx.logger.log({
        spec_section: 'A2/A3',
        severity: 'medium',
        category: 'visual',
        title: `Visual gremlin on company detail: ${gremlins[0]}`,
        description: gremlins.join('; '),
        url: page.url(),
        screenshot: await snap(page, meta.name, 'gremlin'),
      });
    }
  });
}
