import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { getCompanyCadencePeriods } from '@/lib/cadence/periods';
import { peers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Phase 3.6 — peer scorecard data feed for /peer/profile.
 * Returns 6-tile metrics per cadence period for the last ~3 periods.
 *
 * Cadence is read from the peer's most-active company (PR-031: peer
 * may serve multiple companies; we use the one with the most cases this
 * year as the "home" cadence). Falls back to quarterly.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const demoPeer = req.headers.get('x-demo-peer-id');
  if (demoPeer && demoPeer !== params.id) {
    return NextResponse.json(
      { error: `Forbidden: peer ${demoPeer} cannot view scorecard of ${params.id}` },
      { status: 403 }
    );
  }

  // Confirm peer exists.
  const [peer] = await db.select().from(peers).where(eq(peers.id, params.id)).limit(1);
  if (!peer) return NextResponse.json({ error: 'Peer not found' }, { status: 404 });

  // Pick the peer's most-active company for cadence inheritance.
  const homeCompanyResult = await db.execute<{ company_id: string }>(sql`
    SELECT rc.company_id
    FROM review_results rr
    INNER JOIN review_cases rc ON rc.id = rr.case_id
    WHERE rr.peer_id = ${params.id}
    GROUP BY rc.company_id
    ORDER BY COUNT(*) DESC
    LIMIT 1
  `);
  const homeRows =
    ((homeCompanyResult as { rows?: Array<{ company_id: string }> }).rows as
      | Array<{ company_id: string }>
      | undefined) ?? (homeCompanyResult as any);
  const homeCompanyId = homeRows?.[0]?.company_id;

  let cadencePeriods = homeCompanyId
    ? await getCompanyCadencePeriods(homeCompanyId, 1)
    : [];
  if (cadencePeriods.length === 0) {
    // Fallback: synthesize 3 trailing quarters.
    const now = new Date();
    const periods: typeof cadencePeriods = [];
    for (let back = 2; back >= 0; back -= 1) {
      const m = now.getUTCMonth() - back * 3;
      const y = now.getUTCFullYear() + Math.floor(m / 12);
      const sm = ((m % 12) + 12) % 12;
      const start = `${y}-${String(sm + 1).padStart(2, '0')}-01`;
      const end = new Date(Date.UTC(y, sm + 3, 0)).toISOString().slice(0, 10);
      periods.push({
        label: `Q${Math.floor(sm / 3) + 1} ${y}`,
        start_date: start,
        end_date: end,
        type: 'quarterly',
      });
    }
    cadencePeriods = periods;
  }

  const lastThree = cadencePeriods.slice(-3);

  const out = await Promise.all(
    lastThree.map(async (p) => {
      // Volume + turnaround + quality + kickback in one shot.
      const aggResult = await db.execute<{
        volume: number;
        avg_turnaround: number | null;
        on_time_count: number;
        ai_agreement: number | null;
        kickback: number;
      }>(sql`
        SELECT
          COUNT(rr.id)::int AS volume,
          AVG(EXTRACT(EPOCH FROM (rr.submitted_at - rc.assigned_at)) / 86400.0)::float AS avg_turnaround,
          COUNT(*) FILTER (
            WHERE rc.due_date IS NULL OR rr.submitted_at <= rc.due_date
          )::int AS on_time_count,
          AVG(rr.ai_agreement_percentage)::float AS ai_agreement,
          (
            SELECT COUNT(*)::int FROM review_cases rc2
            WHERE rc2.peer_id = ${params.id}
              AND rc2.returned_by_peer_at IS NOT NULL
              AND rc2.returned_by_peer_at::date >= ${p.start_date}::date
              AND rc2.returned_by_peer_at::date <= ${p.end_date}::date
          ) AS kickback
        FROM review_results rr
        INNER JOIN review_cases rc ON rc.id = rr.case_id
        WHERE rr.peer_id = ${params.id}
          AND rr.submitted_at::date >= ${p.start_date}::date
          AND rr.submitted_at::date <= ${p.end_date}::date
      `);
      const aggRow = (
        ((aggResult as { rows?: any[] }).rows as any[]) ?? (aggResult as any)
      )?.[0] ?? { volume: 0, avg_turnaround: null, on_time_count: 0, ai_agreement: null, kickback: 0 };

      // Specialty mix.
      const specResult = await db.execute<{ specialty: string; count: number }>(sql`
        SELECT
          COALESCE(NULLIF(p.specialty, ''), 'Unspecified') AS specialty,
          COUNT(*)::int AS count
        FROM review_results rr
        INNER JOIN review_cases rc ON rc.id = rr.case_id
        INNER JOIN providers     p  ON p.id  = rc.provider_id
        WHERE rr.peer_id = ${params.id}
          AND rr.submitted_at::date >= ${p.start_date}::date
          AND rr.submitted_at::date <= ${p.end_date}::date
        GROUP BY COALESCE(NULLIF(p.specialty, ''), 'Unspecified')
        ORDER BY count DESC
      `);
      const specs =
        ((specResult as { rows?: Array<{ specialty: string; count: number }> }).rows as
          | Array<{ specialty: string; count: number }>
          | undefined) ?? (specResult as any);

      // Earnings.
      const earnResult = await db.execute<{ earnings: number }>(sql`
        SELECT COALESCE(SUM(amount), 0)::float AS earnings
        FROM peer_payouts
        WHERE peer_id = ${params.id}
          AND period_start >= ${p.start_date}::date
          AND period_end   <= ${p.end_date}::date
      `);
      const earnRow =
        (((earnResult as { rows?: any[] }).rows as any[]) ?? (earnResult as any))?.[0];

      const volume = Number(aggRow.volume ?? 0);
      const onTimePct = volume > 0 ? (Number(aggRow.on_time_count ?? 0) / volume) * 100 : null;

      return {
        label: p.label,
        start_date: p.start_date,
        end_date: p.end_date,
        tiles: {
          volume,
          turnaroundAvgDays:
            aggRow.avg_turnaround == null
              ? null
              : Math.round(Number(aggRow.avg_turnaround) * 10) / 10,
          onTimePct,
          qualityVsAi:
            aggRow.ai_agreement == null
              ? null
              : Math.round(Number(aggRow.ai_agreement) * 10) / 10,
          kickbackCount: Number(aggRow.kickback ?? 0),
          specialties: (specs ?? []).map((s: { specialty: string; count: number }) => ({
            specialty: s.specialty,
            count: Number(s.count),
          })),
          earnings: Number(earnRow?.earnings ?? 0),
        },
      };
    })
  );

  return NextResponse.json({ periods: out });
}
