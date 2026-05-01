/**
 * E1 — Admin /reassignments: list of open requests.
 */
import { withPage, ScenarioCtx } from './_shared';
import { snap, loadOk } from '../scenario-helpers';
import { sql } from '../db-helpers';

export const meta = { name: 'admin-reassignments', persona: 'admin' as const };

export async function run(ctx: ScenarioCtx) {
  const log = ctx.logger;
  await withPage(ctx, 'admin', async (page) => {
    log.resetHarvest();
    const { status, bodyText } = await loadOk(page, '/reassignments');
    if (status === 404) {
      log.log({ spec_section: 'E1', severity: 'medium', category: 'not-yet-built', title: '/reassignments 404', description: 'Page missing.' });
      return;
    }
    if (status >= 500) {
      log.log({ spec_section: 'E1', severity: 'critical', category: 'functional', title: `/reassignments ${status}`, description: 'Server error.', screenshot: await snap(page, meta.name, '5xx') });
      return;
    }
    const open = await sql<{ c: string }>(`SELECT COUNT(*)::text c FROM case_reassignment_requests WHERE status='open'`).catch(() => null);
    if (open && parseInt(open[0]?.c || '0', 10) > 0 && !/reassign|request/i.test(bodyText)) {
      log.log({ spec_section: 'E1', severity: 'medium', category: 'functional', title: 'Open reassignment requests but page text empty', description: `open=${open[0]?.c}`, screenshot: await snap(page, meta.name, 'empty') });
    }
  });
}
