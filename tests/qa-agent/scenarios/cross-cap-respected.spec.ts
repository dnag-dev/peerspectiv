import { ScenarioCtx } from './_shared';
import { sql } from '../db-helpers';

export const meta = { name: 'cross-cap-respected', persona: 'cross' as const };
export async function run(ctx: ScenarioCtx) {
  // Reviewers with max_load set: count active cases vs cap.
  const rows = await sql<any>(`
    SELECT r.id, r.first_name, r.last_name, r.max_caseload,
      (SELECT COUNT(*)::int FROM review_cases rc WHERE rc.reviewer_id = r.id AND rc.status NOT IN ('completed','submitted','closed')) AS active
    FROM reviewers r
    WHERE r.max_caseload IS NOT NULL
    LIMIT 50
  `);
  if (rows === null) {
    ctx.logger.log({ spec_section: 'B4/E1', severity: 'info', category: 'data-integrity', title: 'DB unreachable; cap check skipped', description: 'DATABASE_URL not loaded.' });
    return;
  }
  for (const r of rows) {
    if (r.active > r.max_caseload) {
      ctx.logger.log({
        spec_section: 'B4/E1',
        severity: 'high',
        category: 'data-integrity',
        title: `Reviewer ${r.first_name} ${r.last_name} over caseload cap (${r.active}/${r.max_caseload})`,
        description: `Cap not respected for reviewer id=${r.id}.`,
        db_assertion: `count(active cases)=${r.active} > max_caseload=${r.max_caseload}`,
      });
    }
  }
}
