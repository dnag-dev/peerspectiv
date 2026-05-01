/**
 * K2 — Client /portal/submit: multi-step wizard.
 */
import { withPage, ScenarioCtx } from './_shared';
import { snap, settle, tryClick, loadOk } from '../scenario-helpers';

export const meta = { name: 'client-submit', persona: 'client' as const };

export async function run(ctx: ScenarioCtx) {
  const log = ctx.logger;
  await withPage(ctx, 'client', async (page) => {
    log.resetHarvest();
    const { status, bodyText } = await loadOk(page, '/portal/submit');
    if (status === 404) {
      log.log({ spec_section: 'K2', severity: 'medium', category: 'not-yet-built', title: '/portal/submit 404', description: 'Page missing.' });
      return;
    }
    if (status >= 500) {
      log.log({ spec_section: 'K2', severity: 'critical', category: 'functional', title: `/portal/submit ${status}`, description: 'Server error.', screenshot: await snap(page, meta.name, '5xx') });
      return;
    }
    if (!/specialty|step|select|upload/i.test(bodyText)) {
      log.log({ spec_section: 'K2', severity: 'medium', category: 'functional', title: '/portal/submit missing wizard cues', description: 'No step/select/upload keywords.', screenshot: await snap(page, meta.name, 'wiz') });
    }
    // Try advancing
    const advanced = await tryClick(page, [/next/i, /continue/i]);
    if (advanced) {
      await settle(page, 600);
    }
  });
}
