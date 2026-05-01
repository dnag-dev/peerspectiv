import { ScenarioCtx } from './_shared';
import { sql } from '../db-helpers';

export const meta = { name: 'cross-cap-respected', persona: 'cross' as const };
export async function run(ctx: ScenarioCtx) {
  // Reviewers with max_load set: count active cases vs cap.
  const rows = await sql<any>(`
    SELECT r.id, r.full_name, r.max_case_load,
      (SELECT COUNT(*)::int FROM review_cases rc WHERE rc.reviewer_id = r.id AND rc.status NOT IN ('completed','submitted','closed')) AS active
    FROM reviewers r
    WHERE r.max_case_load IS NOT NULL
    LIMIT 50
  `);
  if (rows === null) {
    ctx.logger.log({ spec_section: 'B4/E1', severity: 'info', category: 'data-integrity', title: 'DB query failed for cap check', description: 'sql() returned null.' });
    return;
  }
  for (const r of rows) {
    if (Number(r.active) > Number(r.max_case_load)) {
      ctx.logger.log({
        spec_section: 'B4/E1',
        severity: 'high',
        category: 'data-integrity',
        title: `Reviewer ${r.full_name} over caseload cap (${r.active}/${r.max_case_load})`,
        description: `Cap not respected for reviewer id=${r.id}.`,
        db_assertion: `count(active cases)=${r.active} > max_case_load=${r.max_case_load}`,
      });
    }
  }
}
