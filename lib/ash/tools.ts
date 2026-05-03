/**
 * Phase 8.1 — Typed Ash tool registry.
 *
 * Replaces (and complements) the regex command-parser at lib/ai/command-parser.ts.
 * The chat route (app/api/ash/route.ts) advertises these tools to Anthropic via
 * native tool-use; Claude calls them by name, and we dispatch to a typed handler.
 *
 * Persona scoping rules (enforced at filter time):
 *   admin         → all tools
 *   client        → only tools that read the caller's own company
 *   peer          → only tools that read the caller's own peer record
 *   credentialer  → only credentialing-bucket tools
 *
 * No new deps: hand-rolled JSON-schema input shapes, plain TS types. zod was
 * intentionally avoided — a single registry file is cheaper than a dep.
 */

import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export type AshRole = 'admin' | 'client' | 'peer' | 'credentialer';

export interface AshContext {
  role: AshRole;
  companyId?: string | null;
  peerId?: string | null;
}

export interface AshTool {
  name: string;
  description: string;
  /** Anthropic-style input schema (subset of JSON-schema). */
  input_schema: {
    type: 'object';
    properties: Record<string, { type: string; description?: string; default?: any }>;
    required?: string[];
  };
  /** Roles allowed to invoke this tool. */
  allowed_roles: AshRole[];
  handler: (args: any, ctx: AshContext) => Promise<string>;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

async function rows<T = any>(query: any): Promise<T[]> {
  const result = await db.execute(query);
  // drizzle-neon shape: { rows: [...] } | array
  const r = (result as any)?.rows ?? result;
  return Array.isArray(r) ? (r as T[]) : [];
}

function jsonOk(payload: unknown): string {
  return JSON.stringify(payload);
}

// ─── Tools ─────────────────────────────────────────────────────────────────

export const ASH_TOOLS: AshTool[] = [
  {
    name: 'count_past_due_cases',
    description:
      'Count review cases past their due date. Optionally filter by company_id.',
    allowed_roles: ['admin', 'client'],
    input_schema: {
      type: 'object',
      properties: {
        company_id: { type: 'string', description: 'Optional UUID; admin only.' },
      },
    },
    handler: async (args, ctx) => {
      // Client is locked to own company — ignore arg, use ctx.
      const cid =
        ctx.role === 'client' ? ctx.companyId : (args?.company_id ?? null);
      const r = cid
        ? await rows(sql`SELECT count(*)::int AS n FROM review_cases WHERE status = 'past_due' AND company_id = ${cid}`)
        : await rows(sql`SELECT count(*)::int AS n FROM review_cases WHERE status = 'past_due'`);
      return jsonOk({ past_due_count: r[0]?.n ?? 0, scoped_company_id: cid ?? null });
    },
  },
  {
    name: 'get_company_score',
    description:
      'Get the average overall_score across submitted reviews for a company in the current cadence period.',
    allowed_roles: ['admin', 'client'],
    input_schema: {
      type: 'object',
      properties: {
        company_id: { type: 'string', description: 'Company UUID. Required for admin; ignored for client (uses own).' },
      },
    },
    handler: async (args, ctx) => {
      const cid = ctx.role === 'client' ? ctx.companyId : args?.company_id;
      if (!cid) return jsonOk({ error: 'company_id required' });
      const r = await rows<{ avg_score: string | null; n: number }>(
        sql`SELECT AVG(rr.overall_score)::numeric(5,2) AS avg_score, count(*)::int AS n
            FROM review_results rr
            INNER JOIN review_cases rc ON rc.id = rr.case_id
            WHERE rc.company_id = ${cid}`
      );
      return jsonOk({
        company_id: cid,
        avg_overall_score: r[0]?.avg_score == null ? null : Number(r[0].avg_score),
        review_count: r[0]?.n ?? 0,
      });
    },
  },
  {
    name: 'list_expiring_peers',
    description:
      'List peers whose credential expires within the next N days (default 30). Credentialer-scoped.',
    allowed_roles: ['admin', 'credentialer'],
    input_schema: {
      type: 'object',
      properties: {
        days: { type: 'number', description: 'Window in days; defaults to 30.', default: 30 },
      },
    },
    handler: async (args) => {
      const days = Math.max(1, Math.min(365, Number(args?.days ?? 30)));
      const r = await rows(
        sql`SELECT id, full_name, email, credential_valid_until
            FROM peers
            WHERE credential_valid_until IS NOT NULL
              AND credential_valid_until <= (now() + (${days} || ' days')::interval)
            ORDER BY credential_valid_until ASC
            LIMIT 50`
      );
      return jsonOk({ window_days: days, count: r.length, peers: r });
    },
  },
  {
    name: 'pipeline_summary',
    description:
      'Admin-only: counts of prospects/contracts/active companies by status.',
    allowed_roles: ['admin'],
    input_schema: { type: 'object', properties: {} },
    handler: async () => {
      const cs = await rows(
        sql`SELECT status, count(*)::int AS n FROM companies GROUP BY status ORDER BY status`
      );
      const ct = await rows(
        sql`SELECT status, count(*)::int AS n FROM contracts GROUP BY status ORDER BY status`
      );
      return jsonOk({ companies_by_status: cs, contracts_by_status: ct });
    },
  },
  {
    name: 'list_slow_credentialers',
    description:
      'Admin-only: credentialer users sorted by oldest open onboarding tasks (placeholder: peers in pending_credentialing for > 7 days).',
    allowed_roles: ['admin'],
    input_schema: { type: 'object', properties: {} },
    handler: async () => {
      const r = await rows(
        sql`SELECT id, full_name, email, created_at,
                   (now()::date - created_at::date) AS days_open
            FROM peers
            WHERE state = 'pending_credentialing'
              AND created_at < (now() - interval '7 days')
            ORDER BY created_at ASC
            LIMIT 25`
      );
      return jsonOk({ count: r.length, slow_onboardings: r });
    },
  },
  {
    name: 'my_open_cases',
    description:
      'Peer-only: list the calling peer\'s open (non-completed) review cases.',
    allowed_roles: ['peer'],
    input_schema: { type: 'object', properties: {} },
    handler: async (_args, ctx) => {
      if (!ctx.peerId) return jsonOk({ error: 'peer_id missing from context' });
      const r = await rows(
        sql`SELECT id, status, due_date, encounter_date, specialty_required
            FROM review_cases
            WHERE peer_id = ${ctx.peerId}
              AND status NOT IN ('completed','cancelled')
            ORDER BY due_date ASC NULLS LAST
            LIMIT 50`
      );
      return jsonOk({ count: r.length, cases: r });
    },
  },
];

/** Filter the registry by role for advertise-to-Claude. */
export function toolsForRole(role: AshRole): AshTool[] {
  return ASH_TOOLS.filter((t) => t.allowed_roles.includes(role));
}

/** Lookup a tool by name (with role gate). */
export function findTool(name: string, role: AshRole): AshTool | null {
  const t = ASH_TOOLS.find((x) => x.name === name);
  if (!t) return null;
  if (!t.allowed_roles.includes(role)) return null;
  return t;
}
