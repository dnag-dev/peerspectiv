/**
 * B3 — Admin /assign: pending cases, assign suggestion, approve flow.
 */
import { withPage, ScenarioCtx } from './_shared';
import { snap, settle, tryClick, loadOk } from '../scenario-helpers';
import { sql } from '../db-helpers';

export const meta = { name: 'admin-assign', persona: 'admin' as const };

export async function run(ctx: ScenarioCtx) {
  const log = ctx.logger;
  await withPage(ctx, 'admin', async (page) => {
    log.resetHarvest();
    const { status, bodyText } = await loadOk(page, '/assign');
    if (status === 404) {
      log.log({ spec_section: 'B3', severity: 'medium', category: 'not-yet-built', title: '/assign 404', description: 'Page missing.' });
      return;
    }
    if (status >= 500) {
      log.log({ spec_section: 'B3', severity: 'critical', category: 'functional', title: `/assign ${status}`, description: 'Server error.', screenshot: await snap(page, meta.name, '5xx') });
      return;
    }
    // Look for "Assigned" tab (E2 spec)
    const hasAssignedTab = /assigned/i.test(bodyText);
    if (!hasAssignedTab) {
      log.log({ spec_section: 'E2', severity: 'low', category: 'functional', title: 'No "Assigned" tab visible on /assign', description: 'E2 expects an Assigned tab alongside pending.', url: page.url() });
    }
    // Pending cases count check
    const pending = await sql<{ c: string }>(`SELECT COUNT(*)::text c FROM review_cases WHERE status IN ('pending_assignment','pending')`);
    const pendingN = parseInt(pending?.[0]?.c || '0', 10);
    if (pendingN > 0 && !/pending|unassigned/i.test(bodyText)) {
      log.log({ spec_section: 'B3', severity: 'medium', category: 'functional', title: 'DB has pending cases but page text shows none', description: `DB pending=${pendingN}`, url: page.url(), screenshot: await snap(page, meta.name, 'pending') });
    }
  });
}
