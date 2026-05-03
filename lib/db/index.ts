import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// Lazy-init: defer neon() call until first query so the module can be imported
// at build time without DATABASE_URL being available (Vercel page-data collection).
let _db: NeonHttpDatabase<typeof schema> | null = null;

function getDb(): NeonHttpDatabase<typeof schema> {
  if (!_db) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is not set');
    _db = drizzle(neon(url), { schema });
  }
  return _db;
}

export const db: NeonHttpDatabase<typeof schema> = new Proxy(
  {} as NeonHttpDatabase<typeof schema>,
  {
    get(_target, prop, receiver) {
      return Reflect.get(getDb(), prop, receiver);
    },
  }
);

/**
 * Convert camelCase Drizzle row keys to snake_case to preserve the legacy
 * supabase-shim JSON response contract. Drizzle returns column names in
 * camelCase (because the schema declares `firstName: text('first_name')`),
 * but the historical API responses use snake_case. Use this in API route
 * handlers that return DB rows directly to clients.
 *
 * Recursively walks objects and arrays. Date instances are preserved.
 */
export function toSnake<T = unknown>(value: unknown): T {
  if (value === null || value === undefined) return value as T;
  if (Array.isArray(value)) return value.map((v) => toSnake(v)) as unknown as T;
  if (value instanceof Date) return value as T;
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const sk = k.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase());
      out[sk] = toSnake(v);
    }
    return out as T;
  }
  return value as T;
}

/**
 * Inverse of toSnake. Convert snake_case keys (from clients) to camelCase so
 * we can pass the result directly into a Drizzle .set()/.values() call.
 * Shallow only — sufficient for column-level update payloads.
 */
export function toCamel<T = Record<string, unknown>>(
  value: Record<string, unknown>
): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) {
    const ck = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    out[ck] = v;
  }
  return out as T;
}
