#!/usr/bin/env node
/**
 * Seed review_results for any completed review_cases that don't have a row.
 *
 * Why: scripts/reseed-real-data.mjs creates batches + cases + ai_analyses
 * but never writes peer-submitted result rows. Without those, the donut
 * scores / report PDFs / drill-down counts on completed reviews are
 * empty for the demo. This fills the gap with realistic per-case
 * results consistent with lib/scoring/default-based.ts.
 *
 * Idempotent: ON CONFLICT (case_id) DO NOTHING.
 *
 * Usage: node scripts/seed-review-results.mjs
 */
import { neon } from '@neondatabase/serverless';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const sql = neon(process.env.DATABASE_URL);

// Realistic distribution: most reviews land 80-95, a handful 60-79 (concerning),
// a few 96-100 (excellent), one or two below 60 (corrective-action triggers).
function randomScore(rng) {
  const r = rng();
  if (r < 0.05) return 50 + rng() * 10;     // < 60: 5%
  if (r < 0.20) return 60 + rng() * 19;     // 60-79: 15%
  if (r < 0.85) return 80 + rng() * 15;     // 80-95: 65%
  return 95 + rng() * 5;                      // 96-100: 15%
}

// Seeded RNG so reseeds produce stable scores per case_id.
function rngForId(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return () => {
    h = (h * 1103515245 + 12345) & 0x7fffffff;
    return h / 0x7fffffff;
  };
}

(async () => {
  const cases = await sql.query(`
    SELECT rc.id, rc.peer_id, rc.specialty_required, rc.mrn_number,
           rc.updated_at, rc.due_date,
           p.full_name AS peer_name, p.license_number, p.license_state
    FROM review_cases rc
    LEFT JOIN peers p ON p.id = rc.peer_id
    WHERE rc.status = 'completed'
      AND NOT EXISTS (SELECT 1 FROM review_results rr WHERE rr.case_id = rc.id)
  `);

  console.log(`Found ${cases.length} completed cases without review_results.`);

  let inserted = 0;
  let skipped = 0;

  for (const c of cases) {
    if (!c.peer_id) {
      // Need a peer to attribute the result to. Pick any active peer.
      const [fallback] = await sql.query(`SELECT id, full_name, license_number, license_state FROM peers WHERE status='active' ORDER BY random() LIMIT 1`);
      if (!fallback) { skipped++; continue; }
      c.peer_id = fallback.id;
      c.peer_name = fallback.full_name;
      c.license_number = fallback.license_number;
      c.license_state = fallback.license_state;
    }

    const rng = rngForId(c.id);
    const score = Math.round(randomScore(rng) * 100) / 100;
    const aiAgreement = Math.round((85 + rng() * 14) * 100) / 100;
    const timeSpent = Math.round(8 + rng() * 22); // 8-30 min

    // Plausible per-question criteria scores (3 criteria each scored 0-100).
    const criteria = [
      { criterion: 'Documentation Completeness', score: Math.round(70 + rng() * 30), rationale: 'Chart includes required sections.' },
      { criterion: 'Clinical Appropriateness',   score: Math.round(75 + rng() * 25), rationale: 'Care plan matches presenting condition.' },
      { criterion: 'Care Coordination',          score: Math.round(70 + rng() * 30), rationale: 'Referrals and follow-up documented.' },
    ];

    const deficiencies = score < 75 ? [{ criterion: 'Documentation Completeness', detail: 'Missing follow-up plan' }] : [];
    const submittedAt = c.updated_at || new Date(Date.now() - Math.floor(rng() * 30) * 24 * 60 * 60 * 1000);
    const peerName = c.peer_name || 'Dr. Demo Peer';
    const license = c.license_number || 'MD-DEMO-001';
    const state = c.license_state || 'NY';
    const signatureText = `${peerName}, License ${state}-${license}, signed ${new Date(submittedAt).toISOString().slice(0,10)}`;

    try {
      await sql.query(
        `INSERT INTO review_results (
          case_id, peer_id,
          criteria_scores, deficiencies, overall_score, narrative_final,
          ai_agreement_percentage, time_spent_minutes, submitted_at,
          reviewer_name_snapshot, reviewer_license_snapshot, reviewer_license_state_snapshot,
          mrn_number, reviewer_signature_text,
          peer_name_at_submit, peer_license_at_submit,
          scoring_engine_version
        ) VALUES (
          $1, $2,
          $3::jsonb, $4::jsonb, $5, $6,
          $7, $8, $9,
          $10, $11, $12,
          $13, $14,
          $15, $16,
          'default_based_v1'
        ) ON CONFLICT (case_id) DO NOTHING`,
        [
          c.id, c.peer_id,
          JSON.stringify(criteria), JSON.stringify(deficiencies),
          score, `Reviewed ${new Date(submittedAt).toISOString().slice(0,10)}. ${deficiencies.length ? 'Documentation gaps noted.' : 'Care meets standard.'}`,
          aiAgreement, timeSpent, submittedAt,
          peerName, license, state,
          c.mrn_number || `MRN-${c.id.slice(0,8)}`, signatureText,
          peerName, `${state}-${license}`,
        ]
      );
      inserted++;
      process.stdout.write('.');
    } catch (e) {
      skipped++;
      console.error(`\nFailed for case ${c.id}: ${e.message.slice(0, 120)}`);
    }
  }

  console.log(`\nInserted ${inserted}, skipped ${skipped}.`);

  const after = await sql.query('SELECT count(*)::int c FROM review_results');
  const avg = await sql.query('SELECT round(avg(overall_score)::numeric, 2) AS avg FROM review_results');
  console.log(`review_results total: ${after[0].c}`);
  console.log(`avg overall_score: ${avg[0].avg ?? '(null)'}`);
})();
