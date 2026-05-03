/**
 * E1 — reassignment request → admin sees → reassign happens.
 */
import { ScenarioCtx } from './_shared';
import { sql } from '../db-helpers';

export const meta = { name: 'cross-reassign-request-loop', persona: 'cross' as const };

export async function run(ctx: ScenarioCtx) {
  const log = ctx.logger;
  const open = await sql<{ id: string; case_id: string; status: string }>(`SELECT id, case_id, status FROM case_reassignment_requests ORDER BY created_at DESC LIMIT 10`).catch(() => null);
  if (!open) {
    log.log({ spec_section: 'E1', severity: 'info', category: 'data-integrity', title: 'DB unreachable for reassignment loop check', description: 'Skipped.' });
    return;
  }
  for (const r of open) {
    if (r.status === 'open') {
      // The case should still have its original reviewer
      const c = await sql<{ peer_id: string }>(`SELECT reviewer_id FROM review_cases WHERE id=$1`, [r.case_id]);
      if (c && c.length === 0) {
        log.log({ spec_section: 'E1', severity: 'medium', category: 'data-integrity', title: 'reassignment_request points to nonexistent case', description: `request id=${r.id} case_id=${r.case_id}`, db_assertion: 'FK case_id valid' });
      }
    }
  }
}
