import { checkPage, ScenarioCtx } from './_shared';

export const meta = { name: 'admin-payouts', persona: 'admin' as const };
export async function run(ctx: ScenarioCtx) {
  await checkPage(ctx, 'admin', {
    name: meta.name, path: '/payouts', spec: 'H1/H2', persona: 'admin',
    expectsText: ['payout|earning|reviewer'],
    forbidsText: ['\\$NaN'],
    extra: async (page, logger) => {
      const hasApproveAll = await page.getByRole('button', { name: /approve all/i }).first().isVisible().catch(() => false);
      if (!hasApproveAll) {
        logger.log({ spec_section: 'H1', severity: 'medium', category: 'functional', title: 'Payouts page missing "Approve all" button', description: 'H1 requires bulk approve-all action.', url: page.url() });
      }
    },
  });
}
