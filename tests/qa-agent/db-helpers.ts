/**
 * READ-ONLY Drizzle helpers. Loads .env.local for DATABASE_URL.
 * Wrapped so a missing DB doesn't crash the harness — callers handle null.
 */
import fs from 'fs';
import path from 'path';
import { REPO_ROOT } from './config';

let loaded = false;
function loadEnv() {
  if (loaded) return;
  loaded = true;
  const envPath = path.join(REPO_ROOT, '.env.local');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let v = m[2];
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    if (v.startsWith("'") && v.endsWith("'")) v = v.slice(1, -1);
    if (!process.env[m[1]]) process.env[m[1]] = v;
  }
}

export async function sql<T = any>(query: string, params: any[] = []): Promise<T[] | null> {
  loadEnv();
  if (!process.env.DATABASE_URL) return null;
  try {
    // Lazy import; @neondatabase/serverless is in deps
    const mod: any = await import('@neondatabase/serverless');
    const client = mod.neon(process.env.DATABASE_URL);
    const rows = await client(query, params);
    return rows as T[];
  } catch (e) {
    return null;
  }
}

export async function count(table: string): Promise<number | null> {
  const rows = await sql<{ c: string }>(`SELECT COUNT(*)::text AS c FROM ${table}`);
  if (!rows) return null;
  return parseInt(rows[0]?.c || '0', 10);
}
