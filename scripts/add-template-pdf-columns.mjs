import { neon } from '@neondatabase/serverless';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
const sql = neon(process.env.DATABASE_URL);
await sql`ALTER TABLE company_forms ADD COLUMN IF NOT EXISTS template_pdf_url text`;
await sql`ALTER TABLE company_forms ADD COLUMN IF NOT EXISTS template_pdf_name text`;
console.log('template_pdf_url + template_pdf_name columns added');
