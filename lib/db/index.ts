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

// ─── CL-013 — caller scope resolver for tenant-scoped routes ──────────────
//
// Routes that return tenant-scoped data (review_cases, review_results, etc.)
// must filter by the caller's company_id. Without this, a Hunter Health
// client can read Lowell's cases by guessing UUIDs.
//
// Usage:
//   const scope = await getCallerScope(request);
//   if (scope.role === 'client' && row.companyId !== scope.companyId) → 404
//
// Returns role + (for client) companyId + (for peer) peerId. For admin,
// no filter is applied (returns role only).

export type CallerRole = 'admin' | 'client' | 'peer' | 'credentialer' | 'unknown';

export interface CallerScope {
  role: CallerRole;
  companyId?: string;  // set when role='client'
  peerId?: string;     // set when role='peer'
  email?: string;
}

export async function getCallerScope(
  req: { headers: Headers; cookies: { get: (name: string) => { value: string } | undefined } }
): Promise<CallerScope> {
  // 1. Headers (test path / API consumers)
  const hdrRole = req.headers.get('x-demo-role') as CallerRole | null;
  if (hdrRole) {
    return {
      role: hdrRole,
      companyId: req.headers.get('x-demo-company-id') ?? undefined,
      peerId: req.headers.get('x-demo-peer-id') ?? undefined,
      email: req.headers.get('x-demo-email') ?? undefined,
    };
  }

  // 2. Demo cookie (set by /api/demo/login)
  const demoRaw = req.cookies.get('demo_user')?.value;
  if (demoRaw) {
    try {
      const demo = JSON.parse(demoRaw) as { role?: string; email?: string };
      const role = (demo.role as CallerRole) ?? 'unknown';
      const email = demo.email;
      const scope: CallerScope = { role, email };
      if (role === 'client' && email) {
        // Demo client maps to Hunter Health (the seeded demo company).
        // For real prod tenancy we'd resolve via clients/companies join.
        // Use the existing getDemoCompany() helper so caller scope matches
        // what the rest of the portal sees. Important: prod has duplicate
        // "Hunter Health" rows from repeated reseeds, and getDemoCompany
        // picks one specific row deterministically — we must match it.
        try {
          const { getDemoCompany } = await import('@/lib/portal/queries');
          const company = await getDemoCompany();
          if (company?.id) scope.companyId = company.id;
        } catch {
          /* swallow — leave companyId unset; caller treats as deny */
        }
      } else if (role === 'peer' && email) {
        try {
          const { peers } = await import('./schema');
          const { eq } = await import('drizzle-orm');
          const [row] = await db
            .select({ id: peers.id })
            .from(peers)
            .where(eq(peers.email, email))
            .limit(1);
          if (row) scope.peerId = row.id;
        } catch {
          /* swallow */
        }
      }
      return scope;
    } catch {
      /* fall through */
    }
  }

  // 3. Clerk session (production path) — best-effort.
  try {
    const { auth } = await import('@clerk/nextjs/server');
    const a = auth() as any;
    if (a?.userId) {
      const role = (a.sessionClaims?.publicMetadata?.role as CallerRole) ?? 'unknown';
      const companyId = a.sessionClaims?.publicMetadata?.companyId as string | undefined;
      const peerId = a.sessionClaims?.publicMetadata?.peerId as string | undefined;
      return { role, companyId, peerId };
    }
  } catch {
    /* clerk not configured */
  }

  return { role: 'unknown' };
}
