import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const sql = neon(process.env.DATABASE_URL);
const text = fs.readFileSync(
  path.join(__dirname, '..', 'supabase/migrations/003_extraction_method.sql'),
  'utf-8'
);

const stmts = text
  .split(/;\s*(?:\n|$)/)
  .map((s) => s.trim())
  .filter((s) => s && !s.startsWith('--'));

for (const stmt of stmts) {
  try {
    await sql.query(stmt);
    process.stdout.write('.');
  } catch (e) {
    console.error('\nFAIL:', e.message);
  }
}
console.log(' done');
