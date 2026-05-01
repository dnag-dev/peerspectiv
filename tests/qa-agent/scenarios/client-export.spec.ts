import { checkPage, ScenarioCtx } from './_shared';

export const meta = { name: 'client-export', persona: 'client' as const };
export async function run(ctx: ScenarioCtx) {
  await checkPage(ctx, 'client', {
    name: meta.name, path: '/portal/export', spec: 'I11/I4', persona: 'client',
    expectsText: ['export|download|all'],
    extra: async (page, logger) => {
      const btn = page.getByRole('button', { name: /download all|download/i }).first();
      const visible = await btn.isVisible().catch(() => false);
      if (!visible) {
        logger.log({ spec_section: 'I11', severity: 'medium', category: 'functional', title: 'Export page missing visible Download button', description: 'I11 requires bulk export-all manifest download.', url: page.url() });
      }
    },
  });
}
