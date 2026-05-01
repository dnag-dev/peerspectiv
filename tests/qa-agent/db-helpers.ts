/**
 * READ-ONLY Drizzle helpers. Loads .env.local for DATABASE_URL via dotenv.
 * Wrapped so a missing DB doesn't crash the harness — callers handle null.
 */
import path from 'path';
import { REPO_ROOT } from './config';

let loaded = false;
function loadEnv() {
  if (loaded) return;
  loaded = true;
  // dotenv is already a devDep
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const dotenv = require('dotenv');
  dotenv.config({ path: path.join(REPO_ROOT, '.env.local') });
}

let _client: any = null;
async function getClient() {
  loadEnv();
  if (!process.env.DATABASE_URL) return null;
  if (_client) return _client;
  try {
    const mod: any = await import('@neondatabase/serverless');
    _client = mod.neon(process.env.DATABASE_URL);
    return _client;
  } catch {
    return null;
  }
}

export async function sql<T = any>(query: string, params: any[] = []): Promise<T[] | null> {
  const client = await getClient();
  if (!client) return null;
  try {
    // Modern @neondatabase/serverless: tagged-template is the default callable;
    // .query(text, params) is the parameterized escape hatch.
    const result = params.length === 0
      ? await client.query(query)
      : await client.query(query, params);
    // .query() returns { rows, rowCount, ... } similar to pg
    if (Array.isArray(result)) return result as T[];
    if (result && Array.isArray(result.rows)) return result.rows as T[];
    return [];
  } catch (e) {
    if (process.env.QA_DEBUG) console.error('[qa.sql]', e);
    return null;
  }
}

export async function count(table: string): Promise<number | null> {
  const rows = await sql<{ c: string }>(`SELECT COUNT(*)::text AS c FROM ${table}`);
  if (!rows) return null;
  return parseInt(rows[0]?.c || '0', 10);
}
