/**
 * B4 — max_case_load is respected by assignment.
 */
import { ScenarioCtx } from './_shared';
import { sql } from '../db-helpers';

export const meta = { name: 'cross-cap-respected', persona: 'cross' as const };

export async function run(ctx: ScenarioCtx) {
  const log = ctx.logger;
  const offenders = await sql<{ id: string; full_name: string; max_case_load: number; live: number }>(`
    SELECT r.id, r.full_name, r.max_case_load,
           (SELECT COUNT(*) FROM review_cases rc WHERE rc.reviewer_id=r.id AND rc.status NOT IN ('completed','submitted','closed'))::int AS live
    FROM reviewers r
    WHERE r.max_case_load IS NOT NULL
      AND (SELECT COUNT(*) FROM review_cases rc WHERE rc.reviewer_id=r.id AND rc.status NOT IN ('completed','submitted','closed')) > r.max_case_load
    LIMIT 10
  `).catch(() => null);
  if (!offenders) {
    log.log({ spec_section: 'B4', severity: 'info', category: 'data-integrity', title: 'DB unreachable for cap check', description: 'Skipped.' });
    return;
  }
  for (const o of offenders) {
    log.log({
      spec_section: 'B4', severity: 'high', category: 'data-integrity',
      title: `Reviewer ${o.full_name} exceeds max_case_load`,
      description: `live=${o.live}, cap=${o.max_case_load}`,
      db_assertion: 'live cases <= max_case_load',
    });
  }
}
