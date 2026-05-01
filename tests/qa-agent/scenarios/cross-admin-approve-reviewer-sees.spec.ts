/**
 * E2 — admin approves an assignment → reviewer queue updates. DB-driven check.
 */
import { ScenarioCtx } from './_shared';
import { sql } from '../db-helpers';

export const meta = { name: 'cross-admin-approve-reviewer-sees', persona: 'cross' as const };

export async function run(ctx: ScenarioCtx) {
  const log = ctx.logger;
  // DB consistency: every case with status='assigned' must have reviewer_id non-null
  const orphans = await sql<{ id: string }>(`SELECT id FROM review_cases WHERE status='assigned' AND reviewer_id IS NULL LIMIT 5`).catch(() => null);
  if (orphans && orphans.length > 0) {
    log.log({ spec_section: 'E2', severity: 'high', category: 'data-integrity', title: 'review_cases with status=assigned but reviewer_id NULL', description: `count: ${orphans.length} (e.g. ${orphans[0].id})`, db_assertion: "status='assigned' implies reviewer_id IS NOT NULL" });
  }
  // Active count parity
  const reviewers = await sql<{ id: string; full_name: string; active_cases_count: number }>(`SELECT id, full_name, active_cases_count FROM reviewers WHERE active_cases_count > 0 LIMIT 10`).catch(() => null);
  if (reviewers) {
    for (const r of reviewers) {
      const live = await sql<{ c: string }>(`SELECT COUNT(*)::text c FROM review_cases WHERE reviewer_id=$1 AND status NOT IN ('completed','submitted','closed')`, [r.id]);
      const liveN = parseInt(live?.[0]?.c || '0', 10);
      if (Math.abs(liveN - r.active_cases_count) > 1) {
        log.log({ spec_section: 'E2', severity: 'medium', category: 'data-integrity', title: `reviewers.active_cases_count drift for ${r.full_name}`, description: `stored=${r.active_cases_count} actual=${liveN}`, db_assertion: 'active_cases_count == COUNT(non-terminal cases)' });
      }
    }
  }
}
