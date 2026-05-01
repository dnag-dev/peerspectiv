/**
 * K6 — Client /portal/providers.
 */
import { withPage, ScenarioCtx } from './_shared';
import { snap, loadOk } from '../scenario-helpers';

export const meta = { name: 'client-providers', persona: 'client' as const };

export async function run(ctx: ScenarioCtx) {
  const log = ctx.logger;
  await withPage(ctx, 'client', async (page) => {
    log.resetHarvest();
    const { status, bodyText } = await loadOk(page, '/portal/providers');
    if (status === 404) {
      log.log({ spec_section: 'K6', severity: 'medium', category: 'not-yet-built', title: '/portal/providers 404', description: 'Page missing.' });
      return;
    }
    if (status >= 500) {
      log.log({ spec_section: 'K6', severity: 'critical', category: 'functional', title: `/portal/providers ${status}`, description: 'Server error.', screenshot: await snap(page, meta.name, '5xx') });
      return;
    }
    const re = new RegExp('provider|score|name', 'i');
    if (!re.test(bodyText)) {
      log.log({ spec_section: 'K6', severity: 'medium', category: 'functional', title: '/portal/providers missing expected content "provider|score|name"', description: 'Body did not match keyword.', url: page.url(), screenshot: await snap(page, meta.name, 'shape') });
    }
  });
}
