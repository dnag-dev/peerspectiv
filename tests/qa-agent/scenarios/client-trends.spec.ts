/**
 * K4 — Client /portal/trends.
 */
import { withPage, ScenarioCtx } from './_shared';
import { snap, loadOk } from '../scenario-helpers';

export const meta = { name: 'client-trends', persona: 'client' as const };

export async function run(ctx: ScenarioCtx) {
  const log = ctx.logger;
  await withPage(ctx, 'client', async (page) => {
    log.resetHarvest();
    const { status, bodyText } = await loadOk(page, '/portal/trends');
    if (status === 404) {
      log.log({ spec_section: 'K4', severity: 'medium', category: 'not-yet-built', title: '/portal/trends 404', description: 'Page missing.' });
      return;
    }
    if (status >= 500) {
      log.log({ spec_section: 'K4', severity: 'critical', category: 'functional', title: `/portal/trends ${status}`, description: 'Server error.', screenshot: await snap(page, meta.name, '5xx') });
      return;
    }
    const re = new RegExp('trend|specialty|chart|miss', 'i');
    if (!re.test(bodyText)) {
      log.log({ spec_section: 'K4', severity: 'medium', category: 'functional', title: '/portal/trends missing expected content "trend|specialty|chart|miss"', description: 'Body did not match keyword.', url: page.url(), screenshot: await snap(page, meta.name, 'shape') });
    }
  });
}
