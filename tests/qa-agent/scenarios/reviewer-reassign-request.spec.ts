/**
 * E1 — Reviewer can request reassignment.
 */
import { ScenarioCtx } from './_shared';
import { ApiClient } from '../api-client';
import { sql } from '../db-helpers';

export const meta = { name: 'reviewer-reassign-request', persona: 'reviewer' as const };

export async function run(ctx: ScenarioCtx) {
  const log = ctx.logger;
  const api = new ApiClient();
  api.cookies.set('site_gate', '1');
  await api.loginAs('reviewer');

  const c = await sql<{ id: string }>(
    `SELECT rc.id FROM review_cases rc
     JOIN reviewers r ON r.id = rc.reviewer_id
     WHERE r.email = 'rjohnson@peerspectiv.com'
       AND rc.status NOT IN ('completed','submitted','closed') LIMIT 1`
  ).catch(() => null);
  if (!c || c.length === 0) {
    log.log({ spec_section: 'E1', severity: 'info', category: 'functional', title: 'No assigned case to test reassignment request', description: 'Fixture has no active case for rjohnson.' });
    return;
  }
  const before = await sql<{ c: string }>(`SELECT COUNT(*)::text c FROM case_reassignment_requests WHERE case_id = $1`, [c[0].id]);
  const beforeN = parseInt(before?.[0]?.c || '0', 10);

  const r = await api.post('/api/reassignments', { case_id: c[0].id, reason: 'QA test reason — please ignore', requested_by: 'reviewer' });
  if (r.status === 404) {
    log.log({ spec_section: 'E1', severity: 'medium', category: 'not-yet-built', title: 'POST /api/reassignments 404', description: 'Endpoint missing.' });
    return;
  }
  if (r.status >= 500) {
    log.log({ spec_section: 'E1', severity: 'critical', category: 'functional', title: `POST /api/reassignments ${r.status}`, description: r.text.slice(0, 300) });
    return;
  }
  if (r.status >= 200 && r.status < 300) {
    const after = await sql<{ c: string }>(`SELECT COUNT(*)::text c FROM case_reassignment_requests WHERE case_id = $1`, [c[0].id]);
    const afterN = parseInt(after?.[0]?.c || '0', 10);
    if (afterN <= beforeN) {
      log.log({ spec_section: 'E1', severity: 'high', category: 'data-integrity', title: 'Reassignment request returned 2xx but DB row not inserted', description: `before=${beforeN}, after=${afterN}`, db_assertion: 'case_reassignment_requests row exists' });
    } else {
      // Cleanup
      await sql(`DELETE FROM case_reassignment_requests WHERE case_id = $1 AND reason = 'QA test reason — please ignore'`, [c[0].id]);
    }
  } else {
    log.log({ spec_section: 'E1', severity: 'medium', category: 'functional', title: `POST /api/reassignments ${r.status}`, description: r.text.slice(0, 200) });
  }
}
