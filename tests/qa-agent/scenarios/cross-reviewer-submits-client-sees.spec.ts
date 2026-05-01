import { ScenarioCtx } from './_shared';
import { ApiClient } from '../api-client';

export const meta = { name: 'cross-reviewer-submits-client-sees', persona: 'cross' as const };
export async function run(ctx: ScenarioCtx) {
  const api = new ApiClient();
  await api.loginAs('client');
  const r = await api.get('/api/cases?completed=true');
  if (r.status === 404) {
    ctx.logger.log({ spec_section: 'cross/I1', severity: 'info', category: 'not-yet-built', title: 'No /api/cases?completed listing endpoint', description: 'Cannot verify reviewer-submit→client-visible loop via API.' });
    return;
  }
  if (r.status >= 500) {
    ctx.logger.log({ spec_section: 'cross/I1', severity: 'critical', category: 'functional', title: `GET /api/cases?completed=true returned ${r.status}`, description: r.text.slice(0, 200) });
  }
}
