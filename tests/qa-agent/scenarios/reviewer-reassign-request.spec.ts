import { ScenarioCtx } from './_shared';
import { ApiClient } from '../api-client';

export const meta = { name: 'reviewer-reassign-request', persona: 'reviewer' as const };
export async function run(ctx: ScenarioCtx) {
  const api = new ApiClient();
  await api.loginAs('reviewer');
  const r = await api.get('/api/reassignments');
  if (r.status === 404) {
    ctx.logger.log({ spec_section: 'E3', severity: 'medium', category: 'not-yet-built', title: 'GET /api/reassignments 404', description: 'Reassignment request API missing.' });
    return;
  }
  if (r.status >= 500) {
    ctx.logger.log({ spec_section: 'E3', severity: 'critical', category: 'functional', title: `GET /api/reassignments ${r.status}`, description: r.text.slice(0, 300) });
  }
}
