import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: '/Users/dlnagalla/Projects/peerspectiv/.env.local' });
const sql = neon(process.env.DATABASE_URL);

const tables = ['companies','reviewers','review_cases','review_results','company_forms','invoices','clinics','case_reassignment_requests','user_roles'];
for (const t of tables) {
  const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = ${t} ORDER BY ordinal_position`;
  const rows = cols.length ? await sql.unsafe(`SELECT count(*)::int as c FROM ${t}`) : [{c:'NO TABLE'}];
  console.log(`\n=== ${t} (rows=${rows[0]?.c}) ===`);
  console.log(cols.map(c=>c.column_name).join(', '));
}
