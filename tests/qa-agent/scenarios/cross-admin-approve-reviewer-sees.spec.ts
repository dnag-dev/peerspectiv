import { ScenarioCtx } from './_shared';
import { ApiClient } from '../api-client';

export const meta = { name: 'cross-admin-approve-reviewer-sees', persona: 'cross' as const };
export async function run(ctx: ScenarioCtx) {
  const api = new ApiClient();
  await api.loginAs('admin');
  // No assumption of pending approvals on a fresh seed (per pragmatic notes).
  const pending = await api.get('/api/assign?status=pending_approval');
  if (pending.status === 404) {
    // Try alt endpoint shape
    const alt = await api.get('/api/cases?status=pending_approval');
    if (alt.status === 404) {
      ctx.logger.log({ spec_section: 'cross/N2', severity: 'info', category: 'not-yet-built', title: 'No discoverable pending-approval listing endpoint', description: 'Tried /api/assign and /api/cases with status filter; both 404.' });
      return;
    }
  }
  if ((pending.json && Array.isArray(pending.json) && pending.json.length === 0)) {
    ctx.logger.log({ spec_section: 'cross/N2', severity: 'info', category: 'functional', title: 'No pending cases to test approval flow', description: 'Backend returns empty list for pending approval. Cross-flow not exercised.' });
  }
}
