import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL missing from .env.local');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const uuid = () => crypto.randomUUID();
const dot = () => process.stdout.write('.');

// ─── 26 real FQHC clients ────────────────────────────────────────────────────
const COMPANIES = [
  { name: 'Hunter Health', state: 'Kansas', providers: 36, rate: 70, cycle: 'random', cycleNote: 'Random cycle, currently reviewing Sept-Dec 2025' },
  { name: 'Hampton Roads', state: 'Virginia', providers: 38, rate: 70, cycle: 'quarterly', cycleNote: 'Quarterly' },
  { name: "Ko'olauloa", state: 'Hawaii', providers: 11, rate: 70, cycle: 'quarterly', cycleNote: 'Quarterly' },
  { name: 'NHA-Ohio', state: 'Ohio', providers: 35, rate: 90, cycle: 'quarterly', cycleNote: 'Quarterly' },
  { name: 'Heartland', state: 'Illinois', providers: 28, rate: 70, cycle: 'quarterly', cycleNote: 'Quarterly' },
  { name: 'Moses Lake', state: 'Washington', providers: 10, rate: 90, cycle: 'quarterly', cycleNote: 'Quarterly' },
  { name: 'Lowell', state: 'Massachusetts', providers: 160, rate: 90, cycle: 'quarterly', cycleNote: 'Quarterly' },
  { name: 'CareVide', state: 'Texas', providers: 8, rate: 90, cycle: 'quarterly', cycleNote: 'Quarterly + random' },
  { name: 'Priority Healthcare', state: 'Louisiana', providers: 14, rate: null, cycle: 'quarterly', cycleNote: 'Quarterly' },
  { name: 'El Centro de Corazon', state: 'Texas', providers: 24, rate: 90, cycle: 'quarterly', cycleNote: 'Quarterly' },
  { name: 'Spring Branch', state: 'Texas', providers: 5, rate: 95, cycle: 'random', cycleNote: 'Random' },
  { name: 'Konza Prairie', state: 'Kansas', providers: 16, rate: 80, cycle: 'quarterly', cycleNote: 'Quarterly' },
  { name: 'Baywell Health', state: 'California', providers: 7, rate: 90, cycle: 'quarterly', cycleNote: 'Quarterly' },
  { name: 'Rocking Horse CHC', state: 'Ohio', providers: 15, rate: 90, cycle: 'quarterly', cycleNote: 'Quarterly' },
  { name: 'Upper Great Lakes Family Health Center', state: 'Michigan', providers: 66, rate: 90, cycle: 'quarterly', cycleNote: 'Quarterly' },
  { name: 'Raphael', state: 'Indiana', providers: 7, rate: 90, cycle: 'quarterly', cycleNote: 'Quarterly' },
  { name: 'Promise Health Care', state: 'Illinois', providers: 32, rate: 90, cycle: 'monthly', cycleNote: 'Monthly' },
  { name: 'Sunrise', state: 'Colorado', providers: 48, rate: 90, cycle: 'quarterly', cycleNote: 'Quarterly' },
  { name: 'MedNorth', state: 'North Carolina', providers: 34, rate: 90, cycle: 'quarterly', cycleNote: 'Quarterly' },
  { name: 'Blackstone Valley', state: 'Rhode Island', providers: 2, rate: 90, cycle: 'quarterly', cycleNote: 'Quarterly' },
  { name: 'North Star Health', state: 'Vermont', providers: 47, rate: 90, cycle: 'quarterly', cycleNote: 'Quarterly' },
  { name: 'Great Plain Tribal Leaders', state: 'South Dakota', providers: 62, rate: 90, cycle: 'quarterly', cycleNote: 'Quarterly' },
  { name: 'Lifespan Health', state: 'Tennessee', providers: 2, rate: 90, cycle: 'quarterly', cycleNote: 'Quarterly' },
  { name: 'Kinston CHC', state: 'North Carolina', providers: 5, rate: 90, cycle: 'quarterly', cycleNote: 'Quarterly' },
  { name: 'Santa Barbara Neighborhood Clinic', state: 'California', providers: 3, rate: 90, cycle: 'quarterly', cycleNote: 'Quarterly' },
  { name: 'Aira', state: 'California', providers: 9, rate: 70, cycle: 'random', cycleNote: 'Random' },
  { name: 'Ryan Health', state: 'New York', providers: 25, rate: 90, cycle: 'random', cycleNote: 'Random' },
];

// Multiplier per cycle type to compute annual review count
const annualMult = { monthly: 12, quarterly: 4, annual: 1, random: 4 };

// ─── Provider name pool ──────────────────────────────────────────────────────
const FIRST_NAMES = [
  'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda',
  'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica',
  'Thomas', 'Sarah', 'Charles', 'Karen', 'Christopher', 'Nancy', 'Daniel', 'Lisa',
  'Matthew', 'Betty', 'Anthony', 'Helen', 'Mark', 'Sandra',
];
const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
  'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
  'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
];
// Valid FQHC specialties only (per Viji). Do not add Cardiology/Acupuncture/
// Chiropractic/Podiatry/Optometry — they're not typical FQHC scopes.
const SPECIALTIES = [
  'Family Medicine', 'Pediatrics', 'Internal Medicine', 'OB/GYN',
  'Behavioral Health', 'Dental',
];
const pick = (arr, i) => arr[i % arr.length];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function parseReviewersTsv() {
  const txt = fs.readFileSync(
    path.join(__dirname, '..', '.peerspectiv-assets', 'provider-list.tsv'),
    'utf-8'
  );
  const lines = txt.split('\n').filter((l) => l.trim().length > 0);
  const rows = [];
  // skip header
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split('\t');
    const name = (cols[0] || '').trim();
    if (!name) continue;
    const specialtyRaw = (cols[1] || '').trim();
    const specialty = specialtyRaw.split(',')[0].trim() || 'Family Medicine';
    const rateRaw = (cols[2] || '').trim();
    const rate = parseInt(rateRaw, 10);
    const boardCert = (cols[3] || '').trim();
    const reviewsRaw = (cols[4] || '').trim();
    const reviewsMatch = reviewsRaw.match(/\d+/);
    const reviews = reviewsMatch ? parseInt(reviewsMatch[0], 10) : 0;
    const email = (cols[5] || '').trim();
    rows.push({ name, specialty, rate: isNaN(rate) ? null : rate, boardCert, reviews, email });
  }
  return rows;
}

function fallbackEmail(name) {
  const parts = name.toLowerCase().replace(/[^a-z ]/g, '').split(/\s+/).filter(Boolean);
  const first = parts[0] || 'reviewer';
  const last = parts[parts.length - 1] || 'x';
  return `${first}.${last}@reviewers.peerspectiv.com`;
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('Wiping demo data (FK-safe order)...');
  const wipeOrder = [
    'audit_logs',
    'notifications',
    'retention_schedule',
    'ash_conversations',
    'corrective_actions',
    'review_results',
    'ai_analyses',
    'review_cases',
    'batches',
    'contracts',
    'review_cycles',
    'providers',
    'peer_specialties',
    'peers',
    'companies',
  ];
  for (const t of wipeOrder) {
    try {
      await sql.query(`delete from ${t}`);
      dot();
    } catch (e) {
      console.error(`\nWipe ${t} failed:`, e.message);
    }
  }
  console.log(' done.');

  // ─── Companies ───
  console.log('Inserting 26 companies...');
  const companyIdByName = {};
  let i = 0;
  for (const c of COMPANIES) {
    const id = uuid();
    const mult = annualMult[c.cycle] ?? 4;
    const annual = c.providers * mult;
    const rateStr = c.rate ? `$${c.rate}/review` : 'rate TBD';
    const notes = `Cycle: ${c.cycleNote}. Rate: ${rateStr}.`;
    // DB check constraint only allows monthly/quarterly/semi-annual/annual.
    // 'random' cadence is captured in onboarding_notes; store 'quarterly' as the scheduled cycle.
    const dbCycle = c.cycle === 'random' ? 'quarterly' : c.cycle;
    const nextDueDays = i % 2 === 0 ? 30 : 60;
    const nextDue = new Date(Date.now() + nextDueDays * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    try {
      await sql.query(
        `insert into companies
          (id, name, state, status, annual_review_count, review_cycle,
           onboarding_notes, next_cycle_due, contact_person, contact_email)
         values ($1,$2,$3,'active',$4,$5,$6,$7,null,null)`,
        [id, c.name, c.state, annual, dbCycle, notes, nextDue]
      );
      companyIdByName[c.name] = id;
      dot();
    } catch (e) {
      console.error(`\nCompany insert failed for ${c.name}:`, e.message);
    }
    i++;
  }
  console.log(` ${Object.keys(companyIdByName).length} inserted.`);

  // ─── Reviewers ───
  console.log('Inserting reviewers...');
  const reviewers = parseReviewersTsv();
  let reviewerOk = 0;
  const reviewerIds = [];
  for (const r of reviewers) {
    const id = uuid();
    const email = r.email || fallbackEmail(r.name);
    try {
      // Phase 1.3: peers no longer has specialty/specialties cols; specialty
      // lives in peer_specialties join.
      await sql.query(
        `insert into peers
          (id, full_name, email, board_certification,
           active_cases_count, total_reviews_completed, status, state)
         values ($1,$2,$3,$4,0,$5,'active','active')`,
        [id, r.name, email, r.boardCert || null, r.reviews || 0]
      );
      // Insert specialty into the join table
      if (r.specialty) {
        await sql.query(
          `insert into peer_specialties (peer_id, specialty, verified_status)
           values ($1, $2, 'verified')
           on conflict (peer_id, specialty) do nothing`,
          [id, r.specialty]
        );
      }
      reviewerIds.push({ id, specialty: r.specialty });
      reviewerOk++;
      dot();
    } catch (e) {
      console.error(`\nReviewer insert failed for ${r.name}:`, e.message);
    }
  }
  console.log(` ${reviewerOk} inserted.`);

  // ─── Demo personas (must round-trip with /api/demo/login) ───
  // The demo-login route hard-codes these emails; if the seed doesn't
  // include them, the harness + a real persona login lands on a
  // non-existent reviewer row. Add them here so reseed is canonical.
  console.log('Upserting demo personas (rjohnson)...');
  const rjohnsonId = uuid();
  // Phase 1.3: specialty columns dropped; specialty goes into peer_specialties.
  await sql.query(
    `insert into peers
      (id, full_name, email,
       board_certification, license_number, license_state,
       credential_valid_until, max_case_load, rate_type, rate_amount,
       active_cases_count, total_reviews_completed, status, availability_status, state)
     values ($1, 'Dr. Richard Johnson', 'rjohnson@peerspectiv.com',
             'ABFM', 'MD-12345', 'NY',
             (CURRENT_DATE + interval '2 years')::date, 75,
             'per_report', 100, 0, 0, 'active', 'available', 'active')
     on conflict (email) do update set
       full_name = excluded.full_name,
       license_number = excluded.license_number,
       license_state = excluded.license_state,
       credential_valid_until = excluded.credential_valid_until,
       max_case_load = excluded.max_case_load,
       rate_type = excluded.rate_type,
       rate_amount = excluded.rate_amount,
       status = excluded.status,
       availability_status = excluded.availability_status`,
    [rjohnsonId]
  );
  // Resolve actual id (may be the existing one if upsert hit conflict)
  const [{ id: actualRjohnsonId }] = await sql.query(
    `select id from peers where email = 'rjohnson@peerspectiv.com'`
  );
  // rjohnson is multi-spec: Family Medicine + Pediatrics
  for (const sp of ['Family Medicine', 'Pediatrics']) {
    await sql.query(
      `insert into peer_specialties (peer_id, specialty, verified_status)
       values ($1, $2, 'verified')
       on conflict (peer_id, specialty) do nothing`,
      [actualRjohnsonId, sp]
    );
  }
  reviewerIds.push({ id: actualRjohnsonId, specialty: 'Family Medicine' });
  console.log(' rjohnson upserted.');

  // ─── Providers ───
  console.log('Inserting providers...');
  let providerOk = 0;
  const providersByCompany = {};
  let nameIdx = 0;
  for (const c of COMPANIES) {
    const companyId = companyIdByName[c.name];
    if (!companyId) continue;
    const count = Math.min(Math.floor(c.providers / 4) || 1, 8);
    providersByCompany[c.name] = [];
    for (let k = 0; k < count; k++) {
      const id = uuid();
      const first = pick(FIRST_NAMES, nameIdx);
      const last = pick(LAST_NAMES, nameIdx * 7 + 3);
      const specialty = pick(SPECIALTIES, nameIdx * 3 + k);
      nameIdx++;
      try {
        await sql.query(
          `insert into providers
            (id, company_id, first_name, last_name, specialty, email, status)
           values ($1,$2,$3,$4,$5,$6,'active')`,
          [
            id,
            companyId,
            first,
            last,
            specialty,
            `${first.toLowerCase()}.${last.toLowerCase()}@${c.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.example`,
          ]
        );
        providersByCompany[c.name].push({ id, specialty });
        providerOk++;
        dot();
      } catch (e) {
        console.error(`\nProvider insert failed:`, e.message);
      }
    }
  }
  console.log(` ${providerOk} inserted.`);

  // ─── Batches + cases + ai_analyses ───
  console.log('Inserting sample batches, cases, ai analyses...');
  const featured = ['Hunter Health', 'Lowell', 'Upper Great Lakes Family Health Center'];
  let batchOk = 0;
  let caseOk = 0;
  let analysisOk = 0;
  const statuses = ['completed', 'completed', 'in_progress', 'pending_approval', 'in_progress'];
  for (const cname of featured) {
    const companyId = companyIdByName[cname];
    if (!companyId) continue;
    const batchId = uuid();
    try {
      await sql.query(
        `insert into batches
          (id, batch_name, company_id, date_uploaded, total_cases, assigned_cases,
           completed_cases, status)
         values ($1,$2,$3,now(),0,0,0,'in_progress')`,
        [batchId, 'Q4 2025 Review Cycle', companyId]
      );
      batchOk++;
      dot();
    } catch (e) {
      console.error(`\nBatch insert failed for ${cname}:`, e.message);
      continue;
    }

    const providers = providersByCompany[cname] || [];
    const caseCount = Math.min(providers.length, 7) || 5;
    let completedInBatch = 0;
    for (let k = 0; k < caseCount; k++) {
      const caseId = uuid();
      const status = statuses[k % statuses.length];
      const provider = providers[k % providers.length] || null;
      const providerId = provider ? provider.id : null;
      const specialty = provider ? provider.specialty : 'Family Medicine';
      const reviewerMatch =
        reviewerIds.find((r) => r.specialty === specialty) ||
        reviewerIds[k % reviewerIds.length];
      const reviewerId = reviewerMatch ? reviewerMatch.id : null;
      const dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
      const encounterDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);

      try {
        await sql.query(
          `insert into review_cases
            (id, batch_id, provider_id, peer_id, company_id, assigned_at, due_date,
             encounter_date, status, ai_analysis_status, specialty_required,
             priority, batch_period, chart_file_name)
           values ($1,$2,$3,$4,$5,now(),$6,$7,$8,$9,$10,'normal','Q4 2025',$11)`,
          [
            caseId,
            batchId,
            providerId,
            reviewerId,
            companyId,
            dueDate,
            encounterDate,
            status,
            status === 'completed' ? 'complete' : 'pending',
            specialty,
            `chart-${k + 1}.pdf`,
          ]
        );
        caseOk++;
        dot();
      } catch (e) {
        console.error(`\nCase insert failed:`, e.message);
        continue;
      }

      if (status === 'completed') {
        completedInBatch++;
        const overall = 65 + Math.floor(Math.random() * 31); // 65-95
        const doc = 65 + Math.floor(Math.random() * 31);
        const clin = 65 + Math.floor(Math.random() * 31);
        const care = 65 + Math.floor(Math.random() * 31);
        try {
          await sql.query(
            `insert into ai_analyses
              (id, case_id, chart_summary, overall_score, documentation_score,
               clinical_appropriateness_score, care_coordination_score,
               narrative_draft, model_used, tokens_used, processing_time_ms,
               criteria_scores, deficiencies, extraction_method)
             values ($1,$2,$3,$4,$5,$6,$7,$8,'claude-sonnet-4',4200,3800,$9,$10,'pdf-parse')`,
            [
              uuid(),
              caseId,
              `Patient encounter for ${specialty} visit. Chief complaint documented with appropriate history and physical. Assessment and plan clearly articulated. Follow-up scheduled.`,
              overall,
              doc,
              clin,
              care,
              `Chart review completed for ${specialty} encounter. Documentation meets FQHC UDS quality measure standards with minor improvement opportunities noted around care coordination.`,
              JSON.stringify({
                history_complete: doc,
                exam_documented: clin,
                assessment_clear: overall,
                plan_documented: care,
              }),
              JSON.stringify([
                { category: 'documentation', note: 'Missing review of systems detail' },
              ]),
            ]
          );
          analysisOk++;
          dot();
        } catch (e) {
          console.error(`\nAI analysis insert failed:`, e.message);
        }
      }
    }

    // Update batch counters
    try {
      await sql.query(
        `update batches set total_cases=$1, assigned_cases=$1, completed_cases=$2 where id=$3`,
        [caseCount, completedInBatch, batchId]
      );
    } catch (e) {
      console.error(`\nBatch counter update failed:`, e.message);
    }
  }
  console.log(` ${batchOk} batches, ${caseOk} cases, ${analysisOk} ai analyses.`);

  // Final counts
  const [companyCount] = await sql.query(`select count(*)::int as n from companies`);
  const [reviewerCount] = await sql.query(`select count(*)::int as n from peers`);
  const [providerCount] = await sql.query(`select count(*)::int as n from providers`);
  const [batchCount] = await sql.query(`select count(*)::int as n from batches`);
  const [caseCount] = await sql.query(`select count(*)::int as n from review_cases`);
  const [analysisCount] = await sql.query(`select count(*)::int as n from ai_analyses`);

  console.log(
    `\nInserted: ${companyCount.n} companies, ${reviewerCount.n} reviewers, ${providerCount.n} providers, ${batchCount.n} batches, ${caseCount.n} cases, ${analysisCount.n} ai analyses`
  );
}

main().catch((e) => {
  console.error('\nFATAL:', e);
  process.exit(1);
});
