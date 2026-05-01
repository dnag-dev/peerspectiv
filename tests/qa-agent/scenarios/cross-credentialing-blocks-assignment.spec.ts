/**
 * B2/B3 — expired credentials block new assignments.
 */
import { ScenarioCtx } from './_shared';
import { sql } from '../db-helpers';

export const meta = { name: 'cross-credentialing-blocks-assignment', persona: 'cross' as const };

export async function run(ctx: ScenarioCtx) {
  const log = ctx.logger;
  const rows = await sql<any>(`
    SELECT r.id, r.full_name, r.credential_valid_until
    FROM reviewers r
    WHERE r.credential_valid_until IS NOT NULL AND r.credential_valid_until < CURRENT_DATE
    LIMIT 20
  `);
  if (rows === null) {
    log.log({ spec_section: 'B3', severity: 'info', category: 'data-integrity', title: 'DB unreachable for credentialing check', description: 'Skipped.' });
    return;
  }
  for (const r of rows) {
    const live = await sql<any>(`SELECT COUNT(*)::text AS c FROM review_cases WHERE reviewer_id = $1 AND status NOT IN ('completed','submitted','closed')`, [r.id]);
    if (live && parseInt(live[0]?.c || '0', 10) > 0) {
      log.log({
        spec_section: 'B3', severity: 'high', category: 'data-integrity',
        title: `Reviewer ${r.full_name} has expired credentials but active cases`,
        description: `credential_valid_until=${r.credential_valid_until}; live cases=${live[0]?.c}.`,
        db_assertion: 'expired credentials → 0 active cases',
      });
    }
  }
}
