/**
 * Migration 006 — specialty-aware batches + company_forms.
 *
 * Applies schema changes in place (Neon HTTP driver) and seeds
 * `company_forms` for every active company × every specialty that has
 * form_fields defined, so the demo works for any company picked.
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  console.log('→ ALTER batches ADD COLUMN specialty');
  await sql`ALTER TABLE batches ADD COLUMN IF NOT EXISTS specialty text`;
  await sql`ALTER TABLE batches ADD COLUMN IF NOT EXISTS company_form_id uuid`;

  console.log('→ ALTER review_cases ADD COLUMN company_form_id');
  await sql`ALTER TABLE review_cases ADD COLUMN IF NOT EXISTS company_form_id uuid`;

  console.log('→ CREATE TABLE company_forms');
  await sql`
    CREATE TABLE IF NOT EXISTS company_forms (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
      specialty text NOT NULL,
      form_name text NOT NULL,
      form_fields jsonb NOT NULL,
      is_active boolean DEFAULT true,
      approved_by text,
      approved_at timestamptz DEFAULT now(),
      created_at timestamptz DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_company_forms_lookup ON company_forms (company_id, specialty, is_active)`;

  console.log('→ Seed company_forms from existing form_fields');

  const companies = (await sql`SELECT id, name FROM companies`) as Array<{
    id: string;
    name: string;
  }>;

  // Grab every specialty that has at least one field defined (skip NULL/blank)
  const specialtyRows = (await sql`
    SELECT specialty, json_agg(
      json_build_object(
        'field_key', field_key,
        'field_label', field_label,
        'field_type', field_type,
        'is_required', is_required,
        'display_order', display_order,
        'options', options
      ) ORDER BY display_order
    ) AS fields
    FROM form_fields
    WHERE specialty IS NOT NULL AND specialty != ''
    GROUP BY specialty
  `) as Array<{ specialty: string; fields: unknown[] }>;

  let inserted = 0;
  for (const company of companies) {
    for (const spec of specialtyRows) {
      // Skip if already exists for this company+specialty
      const existing = (await sql`
        SELECT id FROM company_forms
        WHERE company_id = ${company.id} AND specialty = ${spec.specialty}
        LIMIT 1
      `) as Array<{ id: string }>;
      if (existing.length) continue;

      await sql`
        INSERT INTO company_forms (company_id, specialty, form_name, form_fields, approved_by, is_active)
        VALUES (
          ${company.id},
          ${spec.specialty},
          ${`${company.name} — ${spec.specialty} Peer Review Form v1`},
          ${JSON.stringify(spec.fields)}::jsonb,
          ${'CMO / Quality Director'},
          true
        )
      `;
      inserted++;
    }
  }

  console.log(`✓ Inserted ${inserted} company_forms rows`);

  // Backfill existing batches' specialty from the cases they contain
  console.log('→ Backfilling batches.specialty from case majority');
  await sql`
    UPDATE batches b
    SET specialty = sub.specialty
    FROM (
      SELECT batch_id, specialty, rn FROM (
        SELECT batch_id, specialty_required AS specialty, cnt,
               row_number() OVER (PARTITION BY batch_id ORDER BY cnt DESC) AS rn
        FROM (
          SELECT batch_id, specialty_required, count(*) AS cnt
          FROM review_cases
          WHERE batch_id IS NOT NULL AND specialty_required IS NOT NULL
          GROUP BY batch_id, specialty_required
        ) t
      ) t2 WHERE rn = 1
    ) sub
    WHERE b.id = sub.batch_id AND b.specialty IS NULL
  `;

  // Wire each existing batch to the matching company_form (first active one)
  console.log('→ Backfilling batches.company_form_id');
  await sql`
    UPDATE batches b
    SET company_form_id = cf.id
    FROM company_forms cf
    WHERE b.company_id = cf.company_id
      AND b.specialty = cf.specialty
      AND cf.is_active = true
      AND b.company_form_id IS NULL
  `;

  console.log('→ Backfilling review_cases.company_form_id');
  await sql`
    UPDATE review_cases rc
    SET company_form_id = b.company_form_id
    FROM batches b
    WHERE rc.batch_id = b.id
      AND b.company_form_id IS NOT NULL
      AND rc.company_form_id IS NULL
  `;

  const totals = (await sql`
    SELECT
      (SELECT count(*) FROM company_forms) AS company_forms,
      (SELECT count(*) FROM batches WHERE specialty IS NOT NULL) AS batches_w_specialty,
      (SELECT count(*) FROM review_cases WHERE company_form_id IS NOT NULL) AS cases_w_form
  `) as Array<{ company_forms: number; batches_w_specialty: number; cases_w_form: number }>;

  console.log('Totals:', totals[0]);
  console.log('✓ Migration 006 complete');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
