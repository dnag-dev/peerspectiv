import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config({ path: '/Users/dlnagalla/Projects/peerspectiv/.env.local' });
const sql = neon(process.env.DATABASE_URL);
for (const t of ['companies','reviewers','review_cases','review_results','company_forms','invoices','clinics','case_reassignment_requests','user_roles']) {
  const r = await sql.query(`SELECT count(*)::int as c FROM ${t}`);
  console.log(t, '=', r[0].c);
}
