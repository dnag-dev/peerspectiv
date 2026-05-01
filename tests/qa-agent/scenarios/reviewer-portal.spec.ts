/**
 * C1 — Reviewer /reviewer/portal: queue cards, multi-chart grouping.
 */
import { withPage, ScenarioCtx } from './_shared';
import { snap, loadOk } from '../scenario-helpers';
import { sql } from '../db-helpers';

export const meta = { name: 'reviewer-portal', persona: 'reviewer' as const };

export async function run(ctx: ScenarioCtx) {
  const log = ctx.logger;
  await withPage(ctx, 'reviewer', async (page) => {
    log.resetHarvest();
    const { status, bodyText } = await loadOk(page, '/reviewer/portal');
    if (status === 404) {
      log.log({ spec_section: 'C1', severity: 'medium', category: 'not-yet-built', title: '/reviewer/portal 404', description: 'Page missing.' });
      return;
    }
    if (status >= 500) {
      log.log({ spec_section: 'C1', severity: 'critical', category: 'functional', title: `/reviewer/portal ${status}`, description: 'Server error.', screenshot: await snap(page, meta.name, '5xx') });
      return;
    }
    if (!/queue|case|chart|review/i.test(bodyText)) {
      log.log({ spec_section: 'C1', severity: 'medium', category: 'functional', title: '/reviewer/portal missing queue keywords', description: 'No queue/case/chart/review text.', url: page.url(), screenshot: await snap(page, meta.name, 'shape') });
    }
    // DB sanity: reviewer rjohnson has cases?
    const cases = await sql<{ c: string }>(
      `SELECT COUNT(*)::text c FROM review_cases rc
       JOIN reviewers r ON r.id = rc.reviewer_id
       WHERE r.email = 'rjohnson@peerspectiv.com' AND rc.status NOT IN ('completed','submitted','closed')`
    ).catch(() => null);
    if (cases && parseInt(cases[0]?.c || '0', 10) === 0) {
      log.log({ spec_section: 'C1', severity: 'info', category: 'functional', title: 'Reviewer rjohnson has zero active cases (fixture)', description: 'Cannot verify queue rendering against real data.', url: page.url() });
    }
  });
}
