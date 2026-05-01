/**
 * K7 — Client /portal/corrective.
 */
import { withPage, ScenarioCtx } from './_shared';
import { snap, loadOk } from '../scenario-helpers';

export const meta = { name: 'client-corrective', persona: 'client' as const };

export async function run(ctx: ScenarioCtx) {
  const log = ctx.logger;
  await withPage(ctx, 'client', async (page) => {
    log.resetHarvest();
    const { status, bodyText } = await loadOk(page, '/portal/corrective');
    if (status === 404) {
      log.log({ spec_section: 'K7', severity: 'medium', category: 'not-yet-built', title: '/portal/corrective 404', description: 'Page missing.' });
      return;
    }
    if (status >= 500) {
      log.log({ spec_section: 'K7', severity: 'critical', category: 'functional', title: `/portal/corrective ${status}`, description: 'Server error.', screenshot: await snap(page, meta.name, '5xx') });
      return;
    }
    const re = new RegExp('corrective|action|cap|progress', 'i');
    if (!re.test(bodyText)) {
      log.log({ spec_section: 'K7', severity: 'medium', category: 'functional', title: '/portal/corrective missing expected content "corrective|action|cap|progress"', description: 'Body did not match keyword.', url: page.url(), screenshot: await snap(page, meta.name, 'shape') });
    }
  });
}
