/**
 * E3 — when reviewer submits, completion appears in client portal; PHI not visible.
 */
import { ScenarioCtx } from './_shared';
import { sql } from '../db-helpers';
import { withPage } from './_shared';
import { snap, loadOk } from '../scenario-helpers';

export const meta = { name: 'cross-reviewer-submits-client-sees', persona: 'cross' as const };

export async function run(ctx: ScenarioCtx) {
  const log = ctx.logger;
  // Find a recently completed review_results
  const recent = await sql<{ id: string; case_id: string; submitted_at: any }>(`SELECT id, case_id, submitted_at FROM review_results ORDER BY submitted_at DESC NULLS LAST LIMIT 5`).catch(() => null);
  if (!recent || recent.length === 0) {
    log.log({ spec_section: 'E3', severity: 'info', category: 'functional', title: 'No review_results to validate cross-flow', description: 'Empty review_results table.' });
    return;
  }
  await withPage(ctx, 'client', async (page) => {
    log.resetHarvest();
    const { status, bodyText } = await loadOk(page, '/portal/reviews');
    if (status >= 500 || status === 404) {
      log.log({ spec_section: 'E3', severity: 'medium', category: 'functional', title: `/portal/reviews ${status}`, description: 'Cannot reach client reviews list to confirm cross-flow.' });
      return;
    }
    if (/patient name|\bSSN\b|date of birth|\bDOB\b/i.test(bodyText)) {
      log.log({ spec_section: 'E3', severity: 'blocker', category: 'security', title: 'PHI keywords on /portal/reviews after reviewer submission', description: 'Client side leaked PHI in the completed-list view.', url: page.url(), screenshot: await snap(page, meta.name, 'phi') });
    }
  });
}
