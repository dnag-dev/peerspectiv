import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const sql = neon(process.env.DATABASE_URL);
const text = fs.readFileSync(path.join(__dirname, '..', 'supabase/migrations/002_ash_and_corrective.sql'), 'utf-8');

// Split into statements by semicolon at end of line, but preserve DO blocks
const stmts = [];
let current = '';
let inDoBlock = false;
for (const line of text.split('\n')) {
  const trimmed = line.trim();
  if (trimmed.startsWith('--') || !trimmed) continue;
  current += line + '\n';
  if (trimmed.startsWith('do $$')) inDoBlock = true;
  if (trimmed.startsWith('end $$;') || trimmed.startsWith('end$$;')) {
    inDoBlock = false;
    stmts.push(current.trim());
    current = '';
    continue;
  }
  if (!inDoBlock && trimmed.endsWith(';')) {
    stmts.push(current.trim());
    current = '';
  }
}

for (const stmt of stmts) {
  try {
    await sql.query(stmt);
    process.stdout.write('.');
  } catch (e) {
    console.error('\nFAIL:', e.message);
    console.error('STMT:', stmt.slice(0, 200));
  }
}
console.log(' done');
