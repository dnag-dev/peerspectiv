import { ScenarioCtx } from './_shared';
import { ApiClient } from '../api-client';

export const meta = { name: 'reviewer-submit', persona: 'reviewer' as const };
export async function run(ctx: ScenarioCtx) {
  // Backend-only: validate the API exists and responds
  const api = new ApiClient();
  await api.loginAs('reviewer');
  const list = await api.get('/api/reviewer/cases');
  if (list.status >= 500) {
    ctx.logger.log({ spec_section: 'C3/C4', severity: 'critical', category: 'functional', title: `GET /api/reviewer/cases ${list.status}`, description: list.text.slice(0, 300) });
    return;
  }
  if (list.status === 404) {
    ctx.logger.log({ spec_section: 'C3/C4', severity: 'medium', category: 'not-yet-built', title: 'GET /api/reviewer/cases 404', description: 'Endpoint missing.' });
    return;
  }
  if (list.status === 200 && Array.isArray(list.json) && list.json.length === 0) {
    ctx.logger.log({ spec_section: 'C3/C4', severity: 'info', category: 'functional', title: 'No reviewer cases in fixture; cannot exercise submit flow', description: 'Reviewer has zero cases assigned — submit flow not exercised.' });
  }
}
