/**
 * K9 — Client /portal/feedback.
 */
import { withPage, ScenarioCtx } from './_shared';
import { snap, loadOk } from '../scenario-helpers';

export const meta = { name: 'client-feedback', persona: 'client' as const };

export async function run(ctx: ScenarioCtx) {
  const log = ctx.logger;
  await withPage(ctx, 'client', async (page) => {
    log.resetHarvest();
    const { status, bodyText } = await loadOk(page, '/portal/feedback');
    if (status === 404) {
      log.log({ spec_section: 'K9', severity: 'medium', category: 'not-yet-built', title: '/portal/feedback 404', description: 'Page missing.' });
      return;
    }
    if (status >= 500) {
      log.log({ spec_section: 'K9', severity: 'critical', category: 'functional', title: `/portal/feedback ${status}`, description: 'Server error.', screenshot: await snap(page, meta.name, '5xx') });
      return;
    }
    const re = new RegExp('feedback|rating|star', 'i');
    if (!re.test(bodyText)) {
      log.log({ spec_section: 'K9', severity: 'medium', category: 'functional', title: '/portal/feedback missing expected content "feedback|rating|star"', description: 'Body did not match keyword.', url: page.url(), screenshot: await snap(page, meta.name, 'shape') });
    }
  });
}
