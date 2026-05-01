import { checkPage, ScenarioCtx } from './_shared';

export const meta = { name: 'admin-batches', persona: 'admin' as const };
export async function run(ctx: ScenarioCtx) {
  await checkPage(ctx, 'admin', {
    name: meta.name, path: '/batches', spec: 'M1-M5/D1-D7', persona: 'admin',
    expectsText: ['batch|upload|chart'],
    extra: async (page, logger) => {
      const hasDrop = await page.locator('text=/drop|drag/i').first().isVisible().catch(() => false);
      if (!hasDrop) {
        logger.log({ spec_section: 'M1/D5', severity: 'low', category: 'functional', title: 'Batches page: no visible drag/drop affordance', description: 'M1/D5 require DnD batch upload.', url: page.url() });
      }
    },
  });
}
