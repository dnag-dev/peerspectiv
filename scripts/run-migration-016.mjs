import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const sql = neon(process.env.DATABASE_URL);
const text = fs.readFileSync(
  path.join(__dirname, '..', 'supabase/migrations/016_rename-case-reassignment-reviewer-id.sql'),
  'utf-8'
);

const stmts = [];
let current = '';
for (const line of text.split('\n')) {
  if (line.trim().startsWith('--')) continue;
  current += line + '\n';
  if (line.trim().endsWith(';')) {
    stmts.push(current.trim());
    current = '';
  }
}

let ok = 0;
let fail = 0;
for (const stmt of stmts) {
  if (!stmt.trim()) continue;
  try {
    await sql.query(stmt);
    process.stdout.write('.');
    ok++;
  } catch (e) {
    console.error('\nFAIL:', e.message);
    fail++;
  }
}
console.log(`\n${ok} ok, ${fail} failed`);
