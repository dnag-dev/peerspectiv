import { neon } from '@neondatabase/serverless';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const sql = neon(process.env.DATABASE_URL);

const TEMPLATES = {
  Acupuncture: [
    'Was there a documented chief complaint and/or reason for visit?',
    'Was a relevant history obtained (including symptom duration, severity, modifying factors)?',
    'Was there documentation of an appropriate Traditional Chinese Medicine (TCM) assessment (e.g., tongue, pulse, meridian assessment) when applicable?',
    'Was an appropriate diagnosis documented (biomedical and/or TCM diagnosis)?',
    'Was the treatment plan clearly documented, including acupuncture points selected?',
    'Was the number of needles used and/or needle technique documented?',
    'Was the duration of needle retention documented?',
    'If adjunct therapies were used (e.g., cupping, moxibustion, electroacupuncture), were they documented appropriately?',
    'Was informed consent documented for acupuncture treatment?',
    'Was there documentation of patient tolerance and/or response to treatment?',
    'Were any adverse events or complications addressed and documented appropriately?',
    'Was there evidence of appropriate infection control practices documented (e.g., clean needle technique)?',
    'Was a follow-up plan or recommended frequency of treatment documented?',
    'Was the documentation completed in a timely manner according to policy?',
    'Overall, did the encounter meet the standard of care for acupuncture practice within this setting?',
  ],
  Chiropractic: [
    'Was the reason for the chiropractic visit clearly documented?',
    'Was a relevant medical and musculoskeletal history obtained?',
    'Was a focused physical and spinal examination performed and documented?',
    'Were neurological findings assessed and documented when appropriate?',
    'Were diagnoses supported by examination findings?',
    'Were diagnostic imaging or tests ordered appropriately, if applicable?',
    'Was the treatment plan appropriate and individualized?',
    'Were chiropractic manipulative treatments within scope and standard practice?',
    'Was informed consent for treatment documented?',
    'Were contraindications or precautions identified and addressed?',
    'Was patient education or self-care instruction provided?',
    'Were treatment frequency and duration appropriate?',
    'Were referrals made when conditions were outside chiropractic scope?',
    'Was documentation complete and timely?',
    'Was care consistent with the standard of care for chiropractic services?',
  ],
  Podiatry: [
    'Was the reason for visit clearly documented?',
    'Was relevant medical and foot history obtained?',
    'Was a focused lower extremity exam documented?',
    'Were vascular and neurologic assessments documented when appropriate?',
    'Were diagnoses supported by findings?',
    'Were diagnostic tests ordered appropriately?',
    'Was the treatment plan appropriate?',
    'Were procedures within scope and standard practice?',
    'Were medications prescribed appropriately, if applicable?',
    'Was patient education provided?',
    'Were diabetic foot care standards followed when applicable?',
    'Were referrals made appropriately?',
    'Were follow-up instructions clear?',
    'Was documentation complete and timely?',
    'Was care consistent with podiatry standards of care?',
  ],
};

function slugify(text, maxLen = 60) {
  return text
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .split('_')
    .filter(
      (w) =>
        w &&
        !['was', 'were', 'the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'for', 'if', 'when', 'there', 'any', 'did', 'this'].includes(
          w
        )
    )
    .join('_')
    .slice(0, maxLen)
    .replace(/_+$/g, '');
}

async function ensureTable() {
  await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
  await sql`
    CREATE TABLE IF NOT EXISTS form_fields (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      specialty text,
      field_key text NOT NULL,
      field_label text NOT NULL,
      field_type text NOT NULL,
      display_order integer NOT NULL DEFAULT 0,
      is_required boolean NOT NULL DEFAULT true,
      options jsonb,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS form_fields_specialty_idx ON form_fields (specialty, display_order)`;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }

  await ensureTable();

  const specialties = Object.keys(TEMPLATES);

  // Delete existing for these specialties
  const del = await sql`DELETE FROM form_fields WHERE specialty = ANY(${specialties}) RETURNING id`;
  console.log(`Deleted ${del.length} existing rows for ${specialties.join(', ')}`);

  let inserted = 0;
  for (const specialty of specialties) {
    const questions = TEMPLATES[specialty];
    const usedKeys = new Set();
    for (let i = 0; i < questions.length; i++) {
      const label = questions[i];
      let baseKey = slugify(label);
      if (!baseKey) baseKey = `q_${i + 1}`;
      let key = baseKey;
      let n = 2;
      while (usedKeys.has(key)) {
        key = `${baseKey}_${n++}`;
      }
      usedKeys.add(key);

      await sql`
        INSERT INTO form_fields (specialty, field_key, field_label, field_type, display_order, is_required, options)
        VALUES (${specialty}, ${key}, ${label}, 'yes_no', ${i + 1}, true, NULL)
      `;
      inserted++;
    }
  }

  console.log(`Inserted ${inserted} form fields across ${specialties.length} specialties`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
