/**
 * C5 — Reviewer /reviewer/earnings: KPIs + period filter.
 */
import { withPage, ScenarioCtx } from './_shared';
import { snap, loadOk } from '../scenario-helpers';

export const meta = { name: 'reviewer-earnings', persona: 'reviewer' as const };

export async function run(ctx: ScenarioCtx) {
  const log = ctx.logger;
  await withPage(ctx, 'reviewer', async (page) => {
    log.resetHarvest();
    const { status, bodyText } = await loadOk(page, '/reviewer/earnings');
    if (status === 404) {
      log.log({ spec_section: 'C5', severity: 'medium', category: 'not-yet-built', title: '/reviewer/earnings 404', description: 'Page missing.' });
      return;
    }
    if (status >= 500) {
      log.log({ spec_section: 'C5', severity: 'critical', category: 'functional', title: `/reviewer/earnings ${status}`, description: 'Server error.', screenshot: await snap(page, meta.name, '5xx') });
      return;
    }
    const kpis = ['earned', 'completed', 'avg', 'total'];
    const found = kpis.filter((k) => new RegExp(k, 'i').test(bodyText));
    if (found.length < 2) {
      log.log({ spec_section: 'C5', severity: 'medium', category: 'functional', title: 'Earnings page missing KPIs', description: `only ${found.length}/${kpis.length} keywords matched.`, screenshot: await snap(page, meta.name, 'no-kpi') });
    }
  });
}
