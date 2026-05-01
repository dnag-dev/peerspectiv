import { checkPage, ScenarioCtx } from './_shared';

export const meta = { name: 'admin-command', persona: 'admin' as const };
export async function run(ctx: ScenarioCtx) {
  await checkPage(ctx, 'admin', {
    name: meta.name, path: '/command', spec: 'admin-shell', persona: 'admin',
    expectsText: ['command|ash|chat|console'],
    extra: async (page, logger) => {
      // Try to find the chat input and send a non-PHI prompt
      const input = page.locator('input, textarea').first();
      const visible = await input.isVisible().catch(() => false);
      if (!visible) {
        logger.log({ spec_section: 'admin-shell', severity: 'low', category: 'functional', title: 'Command page has no visible input', description: 'Cannot send a test prompt to Ash.', url: page.url() });
        return;
      }
      try {
        await input.fill('What can you help me with?');
        const btn = page.getByRole('button', { name: /send|ask|submit/i }).first();
        if (await btn.isVisible().catch(() => false)) {
          await btn.click({ timeout: 5000 });
          await page.waitForTimeout(8000);
        }
      } catch {
        logger.log({ spec_section: 'admin-shell', severity: 'low', category: 'perf', title: 'Ash chat slow or unresponsive', description: 'Capped wait at 30s; chat did not respond cleanly.', url: page.url() });
      }
    },
  });
}
