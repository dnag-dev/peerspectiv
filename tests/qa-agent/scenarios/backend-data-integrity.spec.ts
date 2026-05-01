/**
 * Backend data integrity sweep — schema-level invariants.
 */
import { ScenarioCtx } from './_shared';
import { sql } from '../db-helpers';

export const meta = { name: 'backend-data-integrity', persona: 'backend' as const };

export async function run(ctx: ScenarioCtx) {
  const log = ctx.logger;

  const checks: Array<{ name: string; spec: string; severity: 'high' | 'medium' | 'low'; sql: string; assertion: string }> = [
    { name: 'orphan review_cases (company_id null)', spec: 'L', severity: 'medium', sql: `SELECT id FROM review_cases WHERE company_id IS NULL LIMIT 5`, assertion: 'review_cases.company_id NOT NULL' },
    { name: 'orphan review_cases (provider_id null)', spec: 'L', severity: 'medium', sql: `SELECT id FROM review_cases WHERE provider_id IS NULL LIMIT 5`, assertion: 'review_cases.provider_id NOT NULL' },
    { name: 'invoices missing total_amount', spec: 'G', severity: 'medium', sql: `SELECT id FROM invoices WHERE total_amount IS NULL LIMIT 5`, assertion: 'invoices.total_amount NOT NULL' },
    { name: 'audit_logs PHI leak — invoice metadata containing patient name', spec: 'L', severity: 'high', sql: `SELECT id FROM audit_logs WHERE resource_type='invoice' AND metadata::text ~* 'patient.?name|ssn|date.?of.?birth' LIMIT 5`, assertion: 'audit_logs.metadata for invoices has no PHI' },
    { name: 'retention past delete_after with NULL deleted_at', spec: 'L', severity: 'medium', sql: `SELECT id FROM retention_schedule WHERE delete_after < NOW() AND deleted_at IS NULL LIMIT 5`, assertion: 'retention_schedule.delete_after past → deleted_at NOT NULL' },
    { name: 'reviewers with non-empty active_cases_count but zero live cases', spec: 'B4', severity: 'low', sql: `SELECT r.id FROM reviewers r WHERE r.active_cases_count > 0 AND NOT EXISTS (SELECT 1 FROM review_cases rc WHERE rc.reviewer_id=r.id AND rc.status NOT IN ('completed','submitted','closed')) LIMIT 5`, assertion: 'active_cases_count > 0 implies at least 1 live case' },
    { name: 'review_results with overall_score outside 0-100', spec: 'C4', severity: 'high', sql: `SELECT id, overall_score FROM review_results WHERE overall_score IS NOT NULL AND (overall_score < 0 OR overall_score > 100) LIMIT 5`, assertion: 'overall_score in [0,100]' },
    { name: 'companies missing name', spec: 'A1', severity: 'medium', sql: `SELECT id FROM companies WHERE name IS NULL OR name = '' LIMIT 5`, assertion: 'companies.name NOT NULL/empty' },
    { name: 'review_cases assigned to reviewer with mismatched specialty', spec: 'B1', severity: 'medium', sql: `SELECT rc.id FROM review_cases rc JOIN reviewers r ON r.id = rc.reviewer_id WHERE rc.specialty_required IS NOT NULL AND NOT (rc.specialty_required = ANY(r.specialties)) LIMIT 5`, assertion: 'reviewer.specialties[] contains case.specialty_required' },
    { name: 'audit_logs missing user_id on writes', spec: 'L', severity: 'low', sql: `SELECT id FROM audit_logs WHERE user_id IS NULL AND action ~* 'create|update|delete' LIMIT 5`, assertion: 'audit_logs.user_id NOT NULL on mutations' },
    { name: 'invoices.itemized_lines mismatched with quantity_override', spec: 'G', severity: 'low', sql: `SELECT id FROM invoices WHERE quantity_override IS NOT NULL AND itemized_lines IS NULL LIMIT 5`, assertion: 'quantity_override → itemized_lines should reconcile' },
  ];

  for (const c of checks) {
    const rows = await sql<any>(c.sql).catch(() => null);
    if (rows === null) {
      log.log({ spec_section: c.spec, severity: 'info', category: 'data-integrity', title: `Skipped: ${c.name} (DB error)`, description: 'sql() returned null.' });
      continue;
    }
    if (rows.length > 0) {
      log.log({
        spec_section: c.spec, severity: c.severity, category: 'data-integrity',
        title: `Integrity: ${c.name}`,
        description: `offending count: ${rows.length}; sample: ${JSON.stringify(rows.slice(0, 3))}`,
        db_assertion: c.assertion,
      });
    }
  }
}
