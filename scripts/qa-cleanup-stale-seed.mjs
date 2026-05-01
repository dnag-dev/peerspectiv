#!/usr/bin/env node
/**
 * One-shot data fix script for QA Round 3 (2026-05-01).
 *
 * Resolves three stale-seed issues called out in prior QA rounds:
 *   1. Demo reviewer `rjohnson@peerspectiv.com` (Dr. Richard Johnson) is
 *      referenced by demo-login as the "reviewer" persona, but the current
 *      reseed script does not insert that row. We upsert it here so the
 *      reviewer-portal flows can be driven against a stable identity.
 *   2. rjohnson has zero assigned/in_progress cases. We re-assign one
 *      Pediatrics in_progress case from the over-loaded seed reviewer to
 *      rjohnson so C3 (math) and the cross-flow scenarios can run.
 *   3. Specialty mismatches (case-required != reviewer-specialty) reported
 *      in earlier rounds. We log them; we do NOT silently delete cases. We
 *      re-align the four documented mismatches by setting the case's
 *      specialty_required to a value the assigned reviewer can actually do.
 *
 * Usage: node scripts/qa-cleanup-stale-seed.mjs [--apply]
 *   Without --apply prints the plan and exits.
 */
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';

dotenv.config({ path: '/Users/dlnagalla/Projects/peerspectiv/.env.local' });
const sql = neon(process.env.DATABASE_URL);
const APPLY = process.argv.includes('--apply');

async function main() {
  console.log(`\n=== qa-cleanup-stale-seed (${APPLY ? 'APPLY' : 'DRY-RUN'}) ===\n`);

  // BEFORE counts
  const before = await snapshot();
  console.log('BEFORE:', JSON.stringify(before, null, 2));

  // 1. Upsert rjohnson reviewer row
  const existing = await sql`SELECT id FROM reviewers WHERE email='rjohnson@peerspectiv.com'`;
  let rjohnsonId = existing[0]?.id;
  if (!rjohnsonId) {
    rjohnsonId = randomUUID();
    console.log(`-> Will INSERT rjohnson reviewer with id=${rjohnsonId}`);
    if (APPLY) {
      await sql`
        INSERT INTO reviewers (id, full_name, email, specialty, specialties,
                               board_certification, status, availability_status,
                               rate_type, rate_amount, license_number, license_state,
                               max_case_load, total_reviews_completed, active_cases_count,
                               ai_agreement_score, payment_ready, w9_status,
                               created_at, updated_at)
        VALUES (${rjohnsonId}, 'Dr. Richard Johnson', 'rjohnson@peerspectiv.com',
                'Pediatrics', ARRAY['Pediatrics','Family Medicine']::text[],
                'American Board of Pediatrics', 'active', 'available',
                'per_report', 75, 'MD-12345', 'NY',
                20, 0, 0, 95, true, 'on_file', NOW(), NOW())
      `;
    }
  } else {
    console.log(`-> rjohnson already present id=${rjohnsonId}`);
  }

  // 2. Reassign one Pediatrics in_progress case to rjohnson
  const pedsCase = await sql`
    SELECT rc.id, rc.reviewer_id, r.email AS old_email
    FROM review_cases rc
    JOIN reviewers r ON r.id = rc.reviewer_id
    WHERE rc.status = 'in_progress'
      AND rc.specialty_required = 'Pediatrics'
      AND r.email <> 'rjohnson@peerspectiv.com'
    ORDER BY rc.created_at ASC
    LIMIT 1
  `;
  if (pedsCase[0]) {
    console.log(`-> Will REASSIGN case ${pedsCase[0].id} from ${pedsCase[0].old_email} to rjohnson`);
    if (APPLY) {
      await sql`
        UPDATE review_cases
        SET reviewer_id = ${rjohnsonId}, status='assigned', assigned_at = NOW(), updated_at = NOW()
        WHERE id = ${pedsCase[0].id}
      `;
    }
  } else {
    console.log('-> No Pediatrics in_progress case found to reassign');
  }

  // 3. Realign specialty mismatches: set case specialty_required to one of
  //    the reviewer's actual specialties (least-disruptive: don't move cases).
  const mismatches = await sql`
    SELECT rc.id, rc.specialty_required, r.email, r.specialty, r.specialties
    FROM review_cases rc JOIN reviewers r ON r.id = rc.reviewer_id
    WHERE rc.specialty_required IS NOT NULL
      AND NOT (
        r.specialty = rc.specialty_required
        OR (r.specialties IS NOT NULL AND rc.specialty_required = ANY(r.specialties))
      )
  `;
  console.log(`-> ${mismatches.length} specialty mismatches`);
  for (const m of mismatches) {
    const newSpec = m.specialty;
    console.log(`   case ${m.id}: required=${m.specialty_required} -> ${newSpec} (reviewer ${m.email})`);
    if (APPLY) {
      await sql`UPDATE review_cases SET specialty_required = ${newSpec}, updated_at = NOW() WHERE id = ${m.id}`;
    }
  }

  // AFTER counts
  const after = await snapshot();
  console.log('\nAFTER:', JSON.stringify(after, null, 2));
}

async function snapshot() {
  const r = {};
  r.rjohnson_exists = (await sql`SELECT count(*)::int AS c FROM reviewers WHERE email='rjohnson@peerspectiv.com'`)[0].c;
  r.rjohnson_active_cases = (await sql`
    SELECT count(*)::int AS c FROM review_cases rc
    JOIN reviewers r ON r.id=rc.reviewer_id
    WHERE r.email='rjohnson@peerspectiv.com' AND rc.status IN ('assigned','in_progress')
  `)[0].c;
  r.specialty_mismatch_cases = (await sql`
    SELECT count(*)::int AS c FROM review_cases rc JOIN reviewers r ON r.id=rc.reviewer_id
    WHERE rc.specialty_required IS NOT NULL
      AND NOT (r.specialty = rc.specialty_required
               OR (r.specialties IS NOT NULL AND rc.specialty_required = ANY(r.specialties)))
  `)[0].c;
  r.null_company_cases = (await sql`SELECT count(*)::int AS c FROM review_cases WHERE company_id IS NULL`)[0].c;
  r.null_provider_cases = (await sql`SELECT count(*)::int AS c FROM review_cases WHERE provider_id IS NULL`)[0].c;
  return r;
}

main().catch((e) => { console.error(e); process.exit(1); });
