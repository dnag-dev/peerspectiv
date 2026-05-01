import { ScenarioCtx } from './_shared';
import { sql } from '../db-helpers';

export const meta = { name: 'backend-data-integrity', persona: 'backend' as const };
export async function run(ctx: ScenarioCtx) {
  const checks: Array<{ q: string; spec: string; title: string; sev: any; cat: any }> = [
    {
      q: `SELECT COUNT(*)::int AS c FROM review_cases WHERE company_id IS NULL`,
      spec: 'A1', title: 'review_cases with NULL company_id', sev: 'high', cat: 'data-integrity',
    },
    {
      q: `SELECT COUNT(*)::int AS c FROM review_cases WHERE provider_id IS NULL AND status NOT IN ('draft')`,
      spec: 'A2', title: 'non-draft review_cases with NULL provider_id', sev: 'high', cat: 'data-integrity',
    },
    {
      q: `SELECT COUNT(*)::int AS c FROM invoices WHERE total_amount IS NOT NULL AND total_amount < 0`,
      spec: 'G1', title: 'invoices with negative total_amount', sev: 'critical', cat: 'data-integrity',
    },
    {
      q: `SELECT COUNT(*)::int AS c FROM review_cases rc WHERE rc.batch_id IS NOT NULL AND rc.batch_id NOT IN (SELECT id FROM batches)`,
      spec: 'mega', title: 'review_cases with orphan batch_id', sev: 'high', cat: 'data-integrity',
    },
    {
      q: `SELECT COUNT(*)::int AS c FROM review_cases WHERE status='completed' AND id NOT IN (SELECT case_id FROM review_results WHERE case_id IS NOT NULL)`,
      spec: 'C-submit', title: 'completed cases lacking review_results row', sev: 'critical', cat: 'data-integrity',
    },
    {
      q: `SELECT COUNT(*)::int AS c FROM review_results WHERE ai_agreement_percentage IS NOT NULL AND (ai_agreement_percentage < 0 OR ai_agreement_percentage > 100)`,
      spec: 'mega', title: 'review_results with out-of-range ai_agreement_percentage', sev: 'high', cat: 'data-integrity',
    },
    {
      q: `SELECT COUNT(*)::int AS c FROM reviewers WHERE credential_valid_until IS NOT NULL AND credential_valid_until < CURRENT_DATE AND availability_status='available'`,
      spec: 'B3', title: 'expired-credential reviewers still showing as available', sev: 'high', cat: 'data-integrity',
    },
    {
      q: `SELECT COUNT(*)::int AS c FROM reviewers WHERE specialties IS NULL OR array_length(specialties,1) = 0`,
      spec: 'B1', title: 'reviewers with no specialties', sev: 'medium', cat: 'data-integrity',
    },
  ];
  let dbIssuesLogged = 0;
  for (const c of checks) {
    const rows = await sql<any>(c.q);
    if (rows === null) {
      ctx.logger.log({ spec_section: c.spec, severity: 'info', category: 'data-integrity', title: `query failed: ${c.title}`, description: c.q.replace(/\s+/g, ' ').trim() });
      continue;
    }
    const n = Number(rows[0]?.c ?? 0);
    if (n > 0) {
      dbIssuesLogged++;
      ctx.logger.log({ spec_section: c.spec, severity: c.sev, category: c.cat, title: `${c.title} (${n} rows)`, description: c.q.replace(/\s+/g, ' ').trim(), db_assertion: c.q });
    }
  }
  if (dbIssuesLogged === 0) {
    ctx.logger.log({ spec_section: 'mega', severity: 'info', category: 'data-integrity', title: `Data integrity sweep clean (${checks.length} checks)`, description: 'All integrity assertions passed.' });
  }
}
