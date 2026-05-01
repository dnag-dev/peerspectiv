/**
 * K5 — Client /portal/quality.
 */
import { withPage, ScenarioCtx } from './_shared';
import { snap, loadOk } from '../scenario-helpers';

export const meta = { name: 'client-quality', persona: 'client' as const };

export async function run(ctx: ScenarioCtx) {
  const log = ctx.logger;
  await withPage(ctx, 'client', async (page) => {
    log.resetHarvest();
    const { status, bodyText } = await loadOk(page, '/portal/quality');
    if (status === 404) {
      log.log({ spec_section: 'K5', severity: 'medium', category: 'not-yet-built', title: '/portal/quality 404', description: 'Page missing.' });
      return;
    }
    if (status >= 500) {
      log.log({ spec_section: 'K5', severity: 'critical', category: 'functional', title: `/portal/quality ${status}`, description: 'Server error.', screenshot: await snap(page, meta.name, '5xx') });
      return;
    }
    const re = new RegExp('quality|insight|recommend', 'i');
    if (!re.test(bodyText)) {
      log.log({ spec_section: 'K5', severity: 'medium', category: 'functional', title: '/portal/quality missing expected content "quality|insight|recommend"', description: 'Body did not match keyword.', url: page.url(), screenshot: await snap(page, meta.name, 'shape') });
    }
  });
}
