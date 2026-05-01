/**
 * I — Admin /command: Ash chat. Verifies API responds.
 */
import { withPage, ScenarioCtx } from './_shared';
import { snap, settle, loadOk } from '../scenario-helpers';

export const meta = { name: 'admin-command', persona: 'admin' as const };

export async function run(ctx: ScenarioCtx) {
  const log = ctx.logger;
  await withPage(ctx, 'admin', async (page) => {
    log.resetHarvest();
    const { status, bodyText } = await loadOk(page, '/command');
    if (status === 404) {
      log.log({ spec_section: 'I', severity: 'medium', category: 'not-yet-built', title: '/command 404', description: 'Page missing.' });
      return;
    }
    if (status >= 500) {
      log.log({ spec_section: 'I', severity: 'critical', category: 'functional', title: `/command ${status}`, description: 'Server error.', screenshot: await snap(page, meta.name, '5xx') });
      return;
    }
    if (!/ash|chat|command|ask/i.test(bodyText)) {
      log.log({ spec_section: 'I', severity: 'medium', category: 'functional', title: '/command missing chat/ash content', description: 'Page does not advertise chat surface.', url: page.url(), screenshot: await snap(page, meta.name, 'no-chat') });
    }
    // Direct API hit (avoid 60s page interaction)
    const r = await page.request.post('/api/ash', {
      data: { messages: [{ role: 'user', content: 'How many companies are in the system?' }] },
      headers: { 'content-type': 'application/json' },
      timeout: 60000,
    }).catch((e) => ({ status: () => 0, text: async () => String(e) }));
    const sc = (r as any).status?.() ?? 0;
    if (sc === 0) {
      log.log({ spec_section: 'I', severity: 'medium', category: 'functional', title: 'POST /api/ash threw', description: await ((r as any).text?.() ?? '') });
    } else if (sc === 404) {
      log.log({ spec_section: 'I', severity: 'medium', category: 'not-yet-built', title: 'POST /api/ash 404', description: 'Endpoint missing.' });
    } else if (sc >= 500) {
      log.log({ spec_section: 'I', severity: 'high', category: 'functional', title: `POST /api/ash ${sc}`, description: (await (r as any).text?.() ?? '').slice(0, 300) });
    }
  });
}
