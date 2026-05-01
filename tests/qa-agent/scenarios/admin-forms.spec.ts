import { checkPage, ScenarioCtx } from './_shared';

export const meta = { name: 'admin-forms', persona: 'admin' as const };
export async function run(ctx: ScenarioCtx) {
  await checkPage(ctx, 'admin', {
    name: meta.name, path: '/forms', spec: 'C1-C6', persona: 'admin',
    expectsText: ['form'],
    extra: async (page, logger) => {
      const txt = await page.locator('body').innerText().catch(() => '');
      if (/\{\s*"|JSON.stringify|\[object Object\]/.test(txt)) {
        logger.log({ spec_section: 'C6', severity: 'high', category: 'functional', title: 'Forms admin leaks raw JSON to UI', description: 'C6 forbids JSON leaks in form rendering.', url: page.url() });
      }
    },
  });
}
