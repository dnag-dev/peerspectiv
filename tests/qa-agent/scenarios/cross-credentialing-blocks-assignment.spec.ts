import { ScenarioCtx } from './_shared';
import { sql } from '../db-helpers';

export const meta = { name: 'cross-credentialing-blocks-assignment', persona: 'cross' as const };
export async function run(ctx: ScenarioCtx) {
  // Read-only DB check: any reviewer with expired credentials should not have active assignments.
  const rows = await sql<any>(`
    SELECT r.id, r.first_name, r.last_name, r.credential_expiry
    FROM reviewers r
    WHERE r.credential_expiry IS NOT NULL AND r.credential_expiry < CURRENT_DATE
    LIMIT 20
  `);
  if (rows === null) {
    ctx.logger.log({ spec_section: 'B3', severity: 'info', category: 'data-integrity', title: 'DB unreachable from harness; skipping credentialing-block check', description: 'DATABASE_URL not loaded; cannot run integrity query.' });
    return;
  }
  for (const r of rows) {
    const live = await sql<any>(`SELECT COUNT(*)::text AS c FROM review_cases WHERE reviewer_id = $1 AND status NOT IN ('completed','submitted','closed')`, [r.id]);
    if (live && parseInt(live[0]?.c || '0', 10) > 0) {
      ctx.logger.log({
        spec_section: 'B3',
        severity: 'high',
        category: 'data-integrity',
        title: `Reviewer ${r.first_name} ${r.last_name} has expired credentials but active cases`,
        description: `credential_expiry=${r.credential_expiry}; live cases=${live[0]?.c}.`,
        db_assertion: 'reviewers.credential_expiry < today AND review_cases.status NOT IN (terminal) > 0',
      });
    }
  }
}
