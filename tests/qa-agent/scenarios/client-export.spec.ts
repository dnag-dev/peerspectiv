/**
 * K8 — Client /portal/export.
 */
import { withPage, ScenarioCtx } from './_shared';
import { snap, loadOk } from '../scenario-helpers';

export const meta = { name: 'client-export', persona: 'client' as const };

export async function run(ctx: ScenarioCtx) {
  const log = ctx.logger;
  await withPage(ctx, 'client', async (page) => {
    log.resetHarvest();
    const { status, bodyText } = await loadOk(page, '/portal/export');
    if (status === 404) {
      log.log({ spec_section: 'K8', severity: 'medium', category: 'not-yet-built', title: '/portal/export 404', description: 'Page missing.' });
      return;
    }
    if (status >= 500) {
      log.log({ spec_section: 'K8', severity: 'critical', category: 'functional', title: `/portal/export ${status}`, description: 'Server error.', screenshot: await snap(page, meta.name, '5xx') });
      return;
    }
    const re = new RegExp('export|download|q[1-4]|quarter', 'i');
    if (!re.test(bodyText)) {
      log.log({ spec_section: 'K8', severity: 'medium', category: 'functional', title: '/portal/export missing expected content "export|download|q[1-4]|quarter"', description: 'Body did not match keyword.', url: page.url(), screenshot: await snap(page, meta.name, 'shape') });
    }
  });
}
