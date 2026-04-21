import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const sql = neon(process.env.DATABASE_URL);
const text = fs.readFileSync(
  path.join(__dirname, '..', 'supabase/migrations/004_prospect_pipeline.sql'),
  'utf-8'
);

// Split by top-level ; followed by newline, preserve DO $$ blocks
const stmts = [];
let current = '';
let inDo = false;
for (const line of text.split('\n')) {
  const t = line.trim();
  if (t.startsWith('--') && !inDo) continue;
  current += line + '\n';
  if (/^do \$\$/i.test(t)) inDo = true;
  if (inDo && /^end\s*\$\$;?/i.test(t)) {
    inDo = false;
    stmts.push(current.trim());
    current = '';
    continue;
  }
  if (!inDo && t.endsWith(';')) {
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
    console.error('STMT:', stmt.slice(0, 150));
    fail++;
  }
}
console.log(`\n${ok} ok, ${fail} failed`);
