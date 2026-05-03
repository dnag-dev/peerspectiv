#!/usr/bin/env node
/**
 * Recompute `reviewers.avg_minutes_per_chart` from the last N=50 results
 * (or all results if fewer). Run via cron or manually.
 *
 *   node scripts/recompute-reviewer-efficiency.mjs
 */

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { sql } from 'drizzle-orm';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL missing from .env.local');
  process.exit(1);
}

const N = 50;
const client = neon(process.env.DATABASE_URL);
const db = drizzle(client);

async function main() {
  const reviewers = await db.execute(sql`SELECT id, full_name FROM reviewers`);
  let updated = 0;
  let skipped = 0;
  for (const r of reviewers.rows ?? reviewers) {
    const id = r.id;
    const rows = await db.execute(sql`
      SELECT time_spent_minutes
      FROM review_results
      WHERE reviewer_id = ${id}
        AND time_spent_minutes IS NOT NULL
        AND time_spent_minutes > 0
      ORDER BY submitted_at DESC NULLS LAST
      LIMIT ${N}
    `);
    const list = rows.rows ?? rows;
    if (!list || list.length === 0) {
      skipped++;
      continue;
    }
    const total = list.reduce((s, x) => s + Number(x.time_spent_minutes || 0), 0);
    const avg = total / list.length;
    await db.execute(sql`
      UPDATE reviewers SET avg_minutes_per_chart = ${avg.toFixed(2)} WHERE id = ${id}
    `);
    updated++;
  }
  console.log(`reviewer-efficiency: updated=${updated} skipped=${skipped}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
