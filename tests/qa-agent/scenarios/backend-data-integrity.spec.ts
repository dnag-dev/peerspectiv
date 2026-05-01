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
      q: `SELECT COUNT(*)::int AS c FROM invoices WHERE total_cents IS NOT NULL AND total_cents < 0`,
      spec: 'G1', title: 'invoices with negative total_cents', sev: 'critical', cat: 'data-integrity',
    },
    {
      q: `SELECT COUNT(*)::int AS c FROM reviewers WHERE specialties IS NULL OR array_length(specialties,1) = 0`,
      spec: 'B1', title: 'reviewers with no specialties', sev: 'medium', cat: 'data-integrity',
    },
  ];
  for (const c of checks) {
    const rows = await sql<any>(c.q);
    if (rows === null) {
      ctx.logger.log({ spec_section: c.spec, severity: 'info', category: 'data-integrity', title: 'DB unreachable for integrity check', description: 'DATABASE_URL not loaded; skipped.' });
      return;
    }
    const n = rows[0]?.c ?? 0;
    if (n > 0) {
      ctx.logger.log({ spec_section: c.spec, severity: c.sev, category: c.cat, title: `${c.title} (${n} rows)`, description: c.q.replace(/\s+/g, ' ').trim(), db_assertion: c.q });
    }
  }
}
