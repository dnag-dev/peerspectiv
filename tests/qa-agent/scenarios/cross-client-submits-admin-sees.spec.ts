import { ScenarioCtx } from './_shared';
import { ApiClient } from '../api-client';

export const meta = { name: 'cross-client-submits-admin-sees', persona: 'cross' as const };
export async function run(ctx: ScenarioCtx) {
  const api = new ApiClient();
  await api.loginAs('admin');
  const b = await api.get('/api/batches');
  if (b.status === 404) {
    ctx.logger.log({ spec_section: 'cross/D4', severity: 'medium', category: 'not-yet-built', title: 'GET /api/batches 404', description: 'Cannot inspect batches as admin.' });
    return;
  }
  if (b.status >= 500) {
    ctx.logger.log({ spec_section: 'cross/D4', severity: 'critical', category: 'functional', title: `GET /api/batches ${b.status}`, description: b.text.slice(0, 200) });
  }
}
