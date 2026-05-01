import { checkPage, ScenarioCtx } from './_shared';

export const meta = { name: 'admin-assign', persona: 'admin' as const };
export async function run(ctx: ScenarioCtx) {
  await checkPage(ctx, 'admin', {
    name: meta.name, path: '/assign', spec: 'E1/E2/N1/N2', persona: 'admin',
    expectsText: ['assign|pipeline|review'],
    extra: async (page, logger) => {
      const txt = await page.locator('body').innerText().catch(() => '');
      // E2 — assigned tab
      if (!/assigned/i.test(txt)) {
        logger.log({ spec_section: 'E2', severity: 'medium', category: 'functional', title: 'Assign page lacks "Assigned" tab', description: 'E2 requires an Assigned tab listing in-flight cases.', url: page.url() });
      }
      // N1 — drag-promote pipeline
      if (!/pipeline|kanban|stage|column/i.test(txt)) {
        logger.log({ spec_section: 'N1', severity: 'low', category: 'functional', title: 'Assign page no pipeline/kanban surface visible', description: 'N1 calls for a drag-promote pipeline view.', url: page.url() });
      }
    },
  });
}
