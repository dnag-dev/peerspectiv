/**
 * H — Admin /payouts: list, current period, approve all.
 */
import { withPage, ScenarioCtx } from './_shared';
import { snap, settle, tryClick, loadOk } from '../scenario-helpers';
import { sql } from '../db-helpers';

export const meta = { name: 'admin-payouts', persona: 'admin' as const };

export async function run(ctx: ScenarioCtx) {
  const log = ctx.logger;
  await withPage(ctx, 'admin', async (page) => {
    log.resetHarvest();
    const { status, bodyText } = await loadOk(page, '/payouts');
    if (status === 404) {
      log.log({ spec_section: 'H', severity: 'medium', category: 'not-yet-built', title: '/payouts 404', description: 'Page missing.' });
      return;
    }
    if (status >= 500) {
      log.log({ spec_section: 'H', severity: 'critical', category: 'functional', title: `/payouts ${status}`, description: 'Server error.', screenshot: await snap(page, meta.name, '5xx') });
      return;
    }
    const pending = await sql<{ c: string }>(`SELECT COUNT(*)::text c FROM reviewer_payouts WHERE status='pending'`);
    const pendingN = parseInt(pending?.[0]?.c || '0', 10);
    if (pendingN > 0) {
      const approveBtn = await page.getByRole('button', { name: /approve/i }).first().isVisible({ timeout: 2000 }).catch(() => false);
      if (!approveBtn) {
        log.log({ spec_section: 'H', severity: 'low', category: 'functional', title: '"Approve" control not visible despite pending payouts', description: `DB pending=${pendingN}`, url: page.url() });
      }
    }
    if (!/payout|amount|reviewer/i.test(bodyText)) {
      log.log({ spec_section: 'H', severity: 'medium', category: 'functional', title: '/payouts missing expected payout content', description: 'No payout/amount/reviewer keywords.', url: page.url() });
    }
  });
}
