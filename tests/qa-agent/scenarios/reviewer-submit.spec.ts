/**
 * C3/C4 — Reviewer submit endpoint + scoring math sanity.
 */
import { ScenarioCtx } from './_shared';
import { ApiClient } from '../api-client';
import { sql } from '../db-helpers';

export const meta = { name: 'reviewer-submit', persona: 'reviewer' as const };

export async function run(ctx: ScenarioCtx) {
  const log = ctx.logger;
  const api = new ApiClient();
  api.cookies.set('site_gate', '1');
  await api.loginAs('reviewer');

  // Hit the submit endpoint with bogus payload to get a contract response
  const r = await api.post('/api/reviewer/submit', { case_id: 'nonexistent', responses: {} });
  if (r.status === 404) {
    log.log({ spec_section: 'C3', severity: 'medium', category: 'not-yet-built', title: 'POST /api/reviewer/submit 404', description: 'Endpoint missing.' });
    return;
  }
  if (r.status >= 500) {
    log.log({ spec_section: 'C3', severity: 'critical', category: 'functional', title: `POST /api/reviewer/submit ${r.status}`, description: r.text.slice(0, 300) });
    return;
  }
  // Expect 4xx for invalid payload (good — validates input)
  if (r.status >= 200 && r.status < 300) {
    log.log({ spec_section: 'C3', severity: 'medium', category: 'security', title: 'POST /api/reviewer/submit accepts bogus case_id with 2xx', description: `status=${r.status}; should validate case existence/ownership.` });
  }

  // Scoring math sanity: compute against any review_results row
  const rows = await sql<{ id: string; responses: any; overall_score: any }>(
    `SELECT id, responses, overall_score FROM review_results WHERE responses IS NOT NULL LIMIT 5`
  ).catch(() => null);
  if (rows) {
    for (const row of rows) {
      try {
        const resp = typeof row.responses === 'string' ? JSON.parse(row.responses) : row.responses;
        if (resp && typeof resp === 'object') {
          let yes = 0, no = 0, na = 0;
          for (const v of Object.values(resp)) {
            if (v === 'yes' || v === true || v === 'Yes') yes++;
            else if (v === 'no' || v === false || v === 'No') no++;
            else if (v === 'na' || v === 'N/A' || v === 'na') na++;
          }
          const denom = yes + no;
          if (denom > 0) {
            const expected = Math.round((yes / denom) * 100);
            const stored = parseFloat(row.overall_score);
            if (!isNaN(stored) && Math.abs(stored - expected) > 5) {
              log.log({ spec_section: 'C4', severity: 'high', category: 'data-integrity', title: 'review_results.overall_score diverges from yes/(yes+no) calculation', description: `row=${row.id} stored=${stored} expected=${expected} (yes=${yes}, no=${no}, na=${na})`, db_assertion: 'overall_score = yes/(yes+no)*100 ± 5' });
              break;
            }
          }
        }
      } catch {}
    }
  }
}
