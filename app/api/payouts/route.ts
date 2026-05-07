import { NextRequest, NextResponse } from 'next/server';
import { db, toSnake } from '@/lib/db';
import { peers, reviewResults, peerPayouts, reviewCases } from '@/lib/db/schema';
import { and, asc, eq, gte, lte, ne, or, isNull, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

async function getAdminUserId(req: NextRequest): Promise<string | null> {
  try {
    const { auth } = await import('@clerk/nextjs/server');
    const result = auth();
    const userId = (result as any)?.userId;
    if (userId) return userId as string;
  } catch {
    /* clerk not configured */
  }
  const demo = req.headers.get('x-demo-user-id');
  if (demo && demo.trim()) return demo.trim();
  if (req.cookies.get('demo_user')?.value) return 'demo-admin';
  return null;
}

type RateType = 'per_minute' | 'per_report' | 'per_hour';

interface ResultRow {
  peer_id: string | null;
  submitted_at: Date | null;
  time_spent_minutes: number | null;
}

function monthBounds(ym?: string): { start: string; end: string; label: string } {
  const now = ym ? new Date(`${ym}-01T00:00:00Z`) : new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const start = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
  const end = new Date(Date.UTC(y, m + 1, 0)).toISOString().slice(0, 10);
  const label = `${start}..${end}`;
  return { start, end, label };
}

function computeUnits(rt: RateType, results: ResultRow[]): number {
  if (rt === 'per_report') return results.length;
  const mins = results.reduce((s, r) => s + (r.time_spent_minutes ?? 0), 0);
  if (rt === 'per_minute') return mins;
  return Math.round((mins / 60) * 100) / 100; // per_hour
}

export async function GET(request: NextRequest) {
  const userId = await getAdminUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month') ?? undefined; // YYYY-MM
    const { start, end } = monthBounds(month);

    // 1. All peers with rate config
    const peerRows = await db
      .select({
        id: peers.id,
        full_name: peers.fullName,
        specialty: sql<string | null>`(select specialty from peer_specialties where peer_id = peers.id order by specialty limit 1)`,
        rate_type: peers.rateType,
        rate_amount: peers.rateAmount,
        status: peers.status,
      })
      .from(peers)
      .orderBy(asc(peers.fullName));

    // 2. All completed results in this period.
    // Phase 5.2 — defensively exclude any result whose case got flipped to
    // 'returned_by_peer' (peers don't earn for cases they returned).
    const resultRows = await db
      .select({
        peer_id: reviewResults.peerId,
        submitted_at: reviewResults.submittedAt,
        time_spent_minutes: reviewResults.timeSpentMinutes,
      })
      .from(reviewResults)
      .leftJoin(reviewCases, eq(reviewResults.caseId, reviewCases.id))
      .where(
        and(
          gte(reviewResults.submittedAt, new Date(`${start}T00:00:00Z`)),
          lte(reviewResults.submittedAt, new Date(`${end}T23:59:59Z`)),
          or(isNull(reviewCases.status), ne(reviewCases.status, 'returned_by_peer'))
        )
      );

    // 3. Existing payout records for this period
    const existing = await db
      .select()
      .from(peerPayouts)
      .where(
        and(
          eq(peerPayouts.periodStart, start),
          eq(peerPayouts.periodEnd, end)
        )
      );

    const existingByPeer = new Map<string, typeof existing[number]>();
    for (const p of existing) {
      existingByPeer.set(p.peerId, p);
    }

    // 4. Group results by peer
    const resultsByPeer = new Map<string, ResultRow[]>();
    for (const r of resultRows) {
      if (!r.peer_id) continue;
      const arr = resultsByPeer.get(r.peer_id) ?? [];
      arr.push(r);
      resultsByPeer.set(r.peer_id, arr);
    }

    // 5. Build output: persisted payout OR computed pending preview
    const rows = peerRows.map((rev) => {
      const persisted = existingByPeer.get(rev.id);
      const rt: RateType = (rev.rate_type as RateType) ?? 'per_minute';
      const rate = Number(rev.rate_amount ?? 0);

      if (persisted) {
        return {
          id: persisted.id,
          peer_id: rev.id,
          peer_name: rev.full_name,
          specialty: rev.specialty ?? '—',
          period_start: persisted.periodStart,
          period_end: persisted.periodEnd,
          unit_type: persisted.unitType,
          units: Number(persisted.units),
          rate_amount: Number(persisted.rateAmount),
          amount: Number(persisted.amount),
          status: persisted.status,
          approved_at: persisted.approvedAt,
          paid_at: persisted.paidAt,
          persisted: true,
        };
      }

      const revResults = resultsByPeer.get(rev.id) ?? [];
      const units = computeUnits(rt, revResults);
      const amount = Math.round(units * rate * 100) / 100;

      return {
        id: null,
        peer_id: rev.id,
        peer_name: rev.full_name,
        specialty: rev.specialty ?? '—',
        period_start: start,
        period_end: end,
        unit_type: rt,
        units,
        rate_amount: rate,
        amount,
        status: 'pending' as const,
        approved_at: null,
        paid_at: null,
        persisted: false,
      };
    });

    return NextResponse.json({ data: rows, period: { start, end } });
  } catch (err) {
    console.error('[API] GET /api/payouts error:', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

/**
 * POST: persist a pending payout (snapshot computed values).
 * Body: { peer_id, period_start, period_end }
 * Optional: { units, rate_amount, unit_type } to override.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { peer_id, period_start, period_end } = body as {
      peer_id?: string;
      period_start?: string;
      period_end?: string;
    };
    if (!peer_id || !period_start || !period_end) {
      return NextResponse.json(
        { error: 'peer_id, period_start, period_end required' },
        { status: 400 }
      );
    }

    const [rev] = await db
      .select({ rate_type: peers.rateType, rate_amount: peers.rateAmount })
      .from(peers)
      .where(eq(peers.id, peer_id))
      .limit(1);

    if (!rev) {
      return NextResponse.json({ error: 'Peer not found' }, { status: 404 });
    }

    const results = await db
      .select({
        peer_id: reviewResults.peerId,
        submitted_at: reviewResults.submittedAt,
        time_spent_minutes: reviewResults.timeSpentMinutes,
      })
      .from(reviewResults)
      .leftJoin(reviewCases, eq(reviewResults.caseId, reviewCases.id))
      .where(
        and(
          eq(reviewResults.peerId, peer_id),
          gte(reviewResults.submittedAt, new Date(`${period_start}T00:00:00Z`)),
          lte(reviewResults.submittedAt, new Date(`${period_end}T23:59:59Z`)),
          or(isNull(reviewCases.status), ne(reviewCases.status, 'returned_by_peer'))
        )
      );

    const rt: RateType = (rev.rate_type as RateType) ?? 'per_minute';
    const rate = Number(rev.rate_amount ?? 0);
    const units = computeUnits(rt, results);
    const amount = Math.round(units * rate * 100) / 100;

    let row;
    try {
      [row] = await db
        .insert(peerPayouts)
        .values({
          peerId: peer_id,
          periodStart: period_start,
          periodEnd: period_end,
          unitType: rt,
          units: String(units),
          rateAmount: String(rate),
          amount: String(amount),
          status: 'pending',
        })
        .returning();
    } catch (err) {
      console.error('[payouts] insert error:', err);
      return NextResponse.json({ error: 'DB_ERROR' }, { status: 500 });
    }

    return NextResponse.json({ data: toSnake(row) });
  } catch (err) {
    console.error('[API] POST /api/payouts error:', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
