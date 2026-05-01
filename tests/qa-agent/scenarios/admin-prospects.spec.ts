/**
 * J — Admin /prospects: kanban pipeline.
 */
import { withPage, ScenarioCtx } from './_shared';
import { snap, loadOk } from '../scenario-helpers';

export const meta = { name: 'admin-prospects', persona: 'admin' as const };

export async function run(ctx: ScenarioCtx) {
  const log = ctx.logger;
  await withPage(ctx, 'admin', async (page) => {
    log.resetHarvest();
    const { status, bodyText } = await loadOk(page, '/prospects');
    if (status === 404) {
      log.log({ spec_section: 'J', severity: 'medium', category: 'not-yet-built', title: '/prospects 404', description: 'Page missing.' });
      return;
    }
    if (status >= 500) {
      log.log({ spec_section: 'J', severity: 'critical', category: 'functional', title: `/prospects ${status}`, description: 'Server error.', screenshot: await snap(page, meta.name, '5xx') });
      return;
    }
    const cols = ['lead', 'prospect', 'demo', 'won', 'lost'];
    const found = cols.filter((c) => new RegExp(c, 'i').test(bodyText));
    if (found.length < 2) {
      log.log({ spec_section: 'J', severity: 'medium', category: 'functional', title: 'Prospects page lacks pipeline columns', description: `only ${found.length}/${cols.length} column labels found.`, screenshot: await snap(page, meta.name, 'no-cols'), url: page.url() });
    }
  });
}
