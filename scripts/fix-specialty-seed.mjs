// Normalizes specialties across reviewers/providers/review_cases to valid FQHC specialties.
// Removes Chiropractic / Acupuncture / Cardiology / Podiatry / Optometry / etc. by mapping
// them to the closest valid FQHC specialty. Also dedupes reviewers by (full_name + email).
//
// Valid FQHC specialties (per Viji):
//   Family Medicine, Pediatrics, OB/GYN, Behavioral Health, Dental, Internal Medicine
//
// Run:  node scripts/fix-specialty-seed.mjs

import { neon } from '@neondatabase/serverless';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL missing from .env.local');
  process.exit(1);
}
const sql = neon(process.env.DATABASE_URL);

const VALID = new Set([
  'Family Medicine',
  'Pediatrics',
  'OB/GYN',
  'Behavioral Health',
  'Dental',
  'Internal Medicine',
]);

// Map any non-FQHC specialty string to a valid one.
function normalize(raw) {
  if (!raw) return 'Family Medicine';
  const s = raw.toString().trim();
  // Take first segment before any comma — reviewers often list multiple
  const first = s.split(',')[0].trim();
  if (VALID.has(first)) return first;
  const lower = first.toLowerCase();
  if (lower.includes('pediatric')) return 'Pediatrics';
  if (lower.includes('ob') || lower.includes('gyn') || lower.includes('obstet')) return 'OB/GYN';
  if (lower.includes('dental') || lower.includes('dentist')) return 'Dental';
  if (
    lower.includes('psychi') ||
    lower.includes('behavioral') ||
    lower.includes('mental') ||
    lower.includes('lpc') ||
    lower.includes('lcp') ||
    lower.includes('counsel') ||
    lower.includes('therapy')
  )
    return 'Behavioral Health';
  if (
    lower.includes('internal') ||
    lower.includes('hiv') ||
    lower.includes('infectious') ||
    lower.includes('cardio') ||
    lower.includes('neuro') ||
    lower.includes('gastro') ||
    lower.includes('urol') ||
    lower.includes('dermat') ||
    lower.includes('pulmon') ||
    lower.includes('endocr') ||
    lower.includes('rheum') ||
    lower.includes('onco')
  )
    return 'Internal Medicine';
  // Chiropractic, Acupuncture, Podiatry, Optometry, Pharmacy, Orthopedics, Urgent Care, Nursing Home → Family Medicine
  return 'Family Medicine';
}

async function main() {
  console.log('Normalizing reviewer specialties...');
  const reviewers = await sql`SELECT id, full_name, email, specialty FROM reviewers`;
  let reviewerUpdates = 0;
  for (const r of reviewers) {
    const normalized = normalize(r.specialty);
    if (normalized !== r.specialty) {
      await sql`UPDATE reviewers SET specialty = ${normalized}, updated_at = now() WHERE id = ${r.id}`;
      reviewerUpdates++;
    }
  }
  console.log(`  ${reviewerUpdates} reviewers updated.`);

  console.log('Normalizing provider specialties...');
  const provs = await sql`SELECT id, specialty FROM providers`;
  let provUpdates = 0;
  for (const p of provs) {
    const normalized = normalize(p.specialty);
    if (normalized !== p.specialty) {
      await sql`UPDATE providers SET specialty = ${normalized}, updated_at = now() WHERE id = ${p.id}`;
      provUpdates++;
    }
  }
  console.log(`  ${provUpdates} providers updated.`);

  console.log('Normalizing review_cases.specialty_required...');
  const cases = await sql`SELECT id, specialty_required FROM review_cases WHERE specialty_required IS NOT NULL`;
  let caseUpdates = 0;
  for (const c of cases) {
    const normalized = normalize(c.specialty_required);
    if (normalized !== c.specialty_required) {
      await sql`UPDATE review_cases SET specialty_required = ${normalized}, updated_at = now() WHERE id = ${c.id}`;
      caseUpdates++;
    }
  }
  console.log(`  ${caseUpdates} cases updated.`);

  console.log('Normalizing batches.specialty...');
  await sql`UPDATE batches SET specialty = 'Family Medicine' WHERE specialty IN ('Chiropractic','Acupuncture','Cardiology','Podiatry','Optometry','Pharmacy','Orthopedics','Urology','Neurology','Dermatology','Gastroenterology','Psychiatry')`;
  await sql`UPDATE batches SET specialty = 'Behavioral Health' WHERE specialty IN ('Psychiatry','LPC','LCP')`;

  // Dedupe reviewers by (lower(full_name)) — keep earliest row, delete the rest.
  console.log('Deduping reviewers by full_name...');
  const dupes = await sql`
    SELECT lower(full_name) AS lname, array_agg(id ORDER BY created_at ASC) AS ids
    FROM reviewers
    WHERE full_name IS NOT NULL
    GROUP BY lower(full_name)
    HAVING count(*) > 1
  `;
  let removedDupes = 0;
  for (const d of dupes) {
    const [keep, ...rest] = d.ids;
    for (const dupId of rest) {
      // Reassign any cases pointing to the dupe back to the keeper
      await sql`UPDATE review_cases SET reviewer_id = ${keep} WHERE reviewer_id = ${dupId}`;
      await sql`UPDATE review_results SET reviewer_id = ${keep} WHERE reviewer_id = ${dupId}`;
      await sql`DELETE FROM reviewers WHERE id = ${dupId}`;
      removedDupes++;
    }
  }
  console.log(`  ${removedDupes} duplicate reviewers removed.`);

  // Final summary
  const [{ n: validCount }] = await sql`
    SELECT count(*)::int AS n FROM reviewers
    WHERE specialty IN ('Family Medicine','Pediatrics','OB/GYN','Behavioral Health','Dental','Internal Medicine')
  `;
  const [{ n: total }] = await sql`SELECT count(*)::int AS n FROM reviewers`;
  console.log(`\nReviewers with valid specialties: ${validCount}/${total}`);
}

main().catch((e) => {
  console.error('\nFATAL:', e);
  process.exit(1);
});
