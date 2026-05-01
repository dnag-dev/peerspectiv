/**
 * K1 — Client /portal: dashboard, role switcher, compliance ring, KPIs.
 */
import { withPage, ScenarioCtx } from './_shared';
import { snap, loadOk } from '../scenario-helpers';

export const meta = { name: 'client-dashboard', persona: 'client' as const };

export async function run(ctx: ScenarioCtx) {
  const log = ctx.logger;
  await withPage(ctx, 'client', async (page) => {
    log.resetHarvest();
    const { status, bodyText } = await loadOk(page, '/portal');
    if (status === 404) {
      log.log({ spec_section: 'K1', severity: 'medium', category: 'not-yet-built', title: '/portal 404', description: 'Page missing.' });
      return;
    }
    if (status >= 500) {
      log.log({ spec_section: 'K1', severity: 'critical', category: 'functional', title: `/portal ${status}`, description: 'Server error.', screenshot: await snap(page, meta.name, '5xx') });
      return;
    }
    // Compliance / KPI keywords
    const expected = ['complian', 'score', 'review', 'submitted', 'pending'];
    const found = expected.filter((k) => new RegExp(k, 'i').test(bodyText));
    if (found.length < 2) {
      log.log({ spec_section: 'K1', severity: 'medium', category: 'functional', title: 'Client dashboard missing KPI keywords', description: `only ${found.length}/${expected.length} matched`, screenshot: await snap(page, meta.name, 'kpi') });
    }
    // Forbid PHI surface
    if (/social security|ssn|date of birth|dob/i.test(bodyText)) {
      log.log({ spec_section: 'K1', severity: 'critical', category: 'security', title: 'Possible PHI keywords on client dashboard', description: 'Found SSN/DOB-style keywords; should never surface here.', url: page.url(), screenshot: await snap(page, meta.name, 'phi') });
    }
  });
}
