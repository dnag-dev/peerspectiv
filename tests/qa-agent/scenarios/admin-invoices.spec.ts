import { checkPage, ScenarioCtx } from './_shared';

export const meta = { name: 'admin-invoices', persona: 'admin' as const };
export async function run(ctx: ScenarioCtx) {
  await checkPage(ctx, 'admin', {
    name: meta.name, path: '/invoices', spec: 'G1/G2', persona: 'admin',
    expectsText: ['invoice'],
    forbidsText: ['\\$NaN', 'NaN%'],
    extra: async (page, logger) => {
      const txt = await page.locator('body').innerText().catch(() => '');
      if (!/quantity|override|itemiz/i.test(txt)) {
        logger.log({ spec_section: 'G1/G2', severity: 'low', category: 'functional', title: 'Invoices page lacks override/itemize surface', description: 'G1 requires quantity override; G2 requires itemize toggle.', url: page.url() });
      }
    },
  });
}
