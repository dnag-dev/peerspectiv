import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { reviewerPayouts } from '@/lib/db/schema';
import { and, eq, gte, inArray, lte } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/**
 * POST /api/payouts/approve-all
 * Body: { period_start: 'YYYY-MM-DD', period_end: 'YYYY-MM-DD' }
 *
 * Bulk-approves all pending payouts whose period falls within the window.
 * Returns { count, total_amount } so the UI can show a summary.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { period_start, period_end } = body as {
      period_start?: string;
      period_end?: string;
    };

    if (!period_start || !period_end) {
      return NextResponse.json(
        { error: 'period_start and period_end required' },
        { status: 400 }
      );
    }

    const pending = await db
      .select({ id: reviewerPayouts.id, amount: reviewerPayouts.amount })
      .from(reviewerPayouts)
      .where(
        and(
          eq(reviewerPayouts.status, 'pending'),
          gte(reviewerPayouts.periodStart, period_start),
          lte(reviewerPayouts.periodEnd, period_end)
        )
      );

    const ids = pending.map((p) => p.id);
    const totalAmount = pending.reduce(
      (s, p) => s + Number(p.amount ?? 0),
      0
    );

    if (ids.length === 0) {
      return NextResponse.json({ count: 0, total_amount: 0 });
    }

    await db
      .update(reviewerPayouts)
      .set({ status: 'approved', approvedAt: new Date() })
      .where(inArray(reviewerPayouts.id, ids));

    return NextResponse.json({
      count: ids.length,
      total_amount: Math.round(totalAmount * 100) / 100,
    });
  } catch (err) {
    console.error('[API] POST /api/payouts/approve-all error:', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
