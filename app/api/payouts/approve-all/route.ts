import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

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

    const { data: pending, error: selErr } = await supabaseAdmin
      .from('reviewer_payouts')
      .select('id, amount')
      .eq('status', 'pending')
      .gte('period_start', period_start)
      .lte('period_end', period_end);

    if (selErr) {
      console.error('[payouts.approve-all] select error:', selErr);
      return NextResponse.json({ error: 'DB_ERROR' }, { status: 500 });
    }

    type PendingRow = { id: string; amount: string | number };
    const ids = ((pending ?? []) as PendingRow[]).map((p) => p.id);
    const totalAmount = ((pending ?? []) as PendingRow[]).reduce(
      (s: number, p: PendingRow) => s + Number(p.amount ?? 0),
      0
    );

    if (ids.length === 0) {
      return NextResponse.json({ count: 0, total_amount: 0 });
    }

    const { error: updErr } = await supabaseAdmin
      .from('reviewer_payouts')
      .update({ status: 'approved', approved_at: new Date().toISOString() })
      .in('id', ids);

    if (updErr) {
      console.error('[payouts.approve-all] update error:', updErr);
      return NextResponse.json({ error: 'DB_ERROR' }, { status: 500 });
    }

    return NextResponse.json({
      count: ids.length,
      total_amount: Math.round(totalAmount * 100) / 100,
    });
  } catch (err) {
    console.error('[API] POST /api/payouts/approve-all error:', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
