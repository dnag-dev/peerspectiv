import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Phase 3.6 — list every completed review submitted by this peer.
 * Powers the "My Reviews" tab on /peer/profile.
 *
 * Cross-peer access is enforced server-side: we'll add a session check when
 * peer auth lands. For now (demo mode) the route honours x-demo-peer-id and
 * 403s on mismatch, mirroring the persona-guard contract.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const demoPeer = req.headers.get('x-demo-peer-id');
  if (demoPeer && demoPeer !== params.id) {
    return NextResponse.json(
      { error: `Forbidden: peer ${demoPeer} cannot view reviews of ${params.id}` },
      { status: 403 }
    );
  }
  try {
    const result = await db.execute(sql`
      SELECT
        rr.id AS result_id,
        COALESCE(NULLIF(TRIM(CONCAT(p.first_name, ' ', p.last_name)), ''), 'Unknown provider') AS provider_name,
        rr.submitted_at,
        co.name AS company_name,
        rr.overall_score
      FROM review_results rr
      INNER JOIN review_cases rc ON rc.id = rr.case_id
      INNER JOIN providers     p  ON p.id  = rc.provider_id
      INNER JOIN companies     co ON co.id = rc.company_id
      WHERE rr.peer_id = ${params.id}
      ORDER BY rr.submitted_at DESC
      LIMIT 200
    `);
    const rows =
      ((result as { rows?: unknown[] }).rows as Array<{
        result_id: string;
        provider_name: string;
        submitted_at: string;
        company_name: string;
        overall_score: number | null;
      }>) ?? (result as any);
    return NextResponse.json({ reviews: rows ?? [] });
  } catch (err) {
    console.error('[api/peers/:id/reviews] failed:', err);
    return NextResponse.json({ error: 'Failed to load reviews' }, { status: 500 });
  }
}
