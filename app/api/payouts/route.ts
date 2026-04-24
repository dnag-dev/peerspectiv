import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type RateType = 'per_minute' | 'per_report' | 'per_hour';

interface ReviewerRow {
  id: string;
  full_name: string;
  specialty: string | null;
  rate_type: RateType | null;
  rate_amount: string | number | null;
  status: string | null;
}

interface ResultRow {
  reviewer_id: string | null;
  submitted_at: string | null;
  time_spent_minutes: number | null;
}

interface PayoutRow {
  id: string;
  reviewer_id: string;
  period_start: string;
  period_end: string;
  unit_type: RateType;
  units: string | number;
  rate_amount: string | number;
  amount: string | number;
  status: 'pending' | 'approved' | 'paid';
  created_at: string;
  approved_at: string | null;
  paid_at: string | null;
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
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month') ?? undefined; // YYYY-MM
    const { start, end } = monthBounds(month);

    // 1. All reviewers with rate config
    const { data: reviewers, error: revErr } = await supabaseAdmin
      .from('reviewers')
      .select('id, full_name, specialty, rate_type, rate_amount, status')
      .order('full_name');

    if (revErr) {
      console.error('[payouts] reviewer fetch error:', revErr);
      return NextResponse.json({ error: 'DB_ERROR' }, { status: 500 });
    }

    // 2. All completed results in this period
    const { data: results, error: resErr } = await supabaseAdmin
      .from('review_results')
      .select('reviewer_id, submitted_at, time_spent_minutes')
      .gte('submitted_at', `${start}T00:00:00Z`)
      .lte('submitted_at', `${end}T23:59:59Z`);

    if (resErr) {
      console.error('[payouts] results fetch error:', resErr);
    }

    // 3. Existing payout records for this period
    const { data: existing } = await supabaseAdmin
      .from('reviewer_payouts')
      .select('*')
      .eq('period_start', start)
      .eq('period_end', end);

    const existingByReviewer = new Map<string, PayoutRow>();
    for (const p of (existing ?? []) as PayoutRow[]) {
      existingByReviewer.set(p.reviewer_id, p);
    }

    // 4. Group results by reviewer
    const resultsByReviewer = new Map<string, ResultRow[]>();
    for (const r of (results ?? []) as ResultRow[]) {
      if (!r.reviewer_id) continue;
      const arr = resultsByReviewer.get(r.reviewer_id) ?? [];
      arr.push(r);
      resultsByReviewer.set(r.reviewer_id, arr);
    }

    // 5. Build output: persisted payout OR computed pending preview
    const rows = ((reviewers ?? []) as ReviewerRow[]).map((rev) => {
      const persisted = existingByReviewer.get(rev.id);
      const rt: RateType = (rev.rate_type as RateType) ?? 'per_minute';
      const rate = Number(rev.rate_amount ?? 0);

      if (persisted) {
        return {
          id: persisted.id,
          reviewer_id: rev.id,
          reviewer_name: rev.full_name,
          specialty: rev.specialty ?? '—',
          period_start: persisted.period_start,
          period_end: persisted.period_end,
          unit_type: persisted.unit_type,
          units: Number(persisted.units),
          rate_amount: Number(persisted.rate_amount),
          amount: Number(persisted.amount),
          status: persisted.status,
          approved_at: persisted.approved_at,
          paid_at: persisted.paid_at,
          persisted: true,
        };
      }

      const revResults = resultsByReviewer.get(rev.id) ?? [];
      const units = computeUnits(rt, revResults);
      const amount = Math.round(units * rate * 100) / 100;

      return {
        id: null,
        reviewer_id: rev.id,
        reviewer_name: rev.full_name,
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
 * Body: { reviewer_id, period_start, period_end }
 * Optional: { units, rate_amount, unit_type } to override.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reviewer_id, period_start, period_end } = body as {
      reviewer_id?: string;
      period_start?: string;
      period_end?: string;
    };
    if (!reviewer_id || !period_start || !period_end) {
      return NextResponse.json(
        { error: 'reviewer_id, period_start, period_end required' },
        { status: 400 }
      );
    }

    const { data: rev, error: revErr } = await supabaseAdmin
      .from('reviewers')
      .select('rate_type, rate_amount')
      .eq('id', reviewer_id)
      .single();
    if (revErr || !rev) {
      return NextResponse.json({ error: 'Reviewer not found' }, { status: 404 });
    }

    const { data: results } = await supabaseAdmin
      .from('review_results')
      .select('reviewer_id, submitted_at, time_spent_minutes')
      .eq('reviewer_id', reviewer_id)
      .gte('submitted_at', `${period_start}T00:00:00Z`)
      .lte('submitted_at', `${period_end}T23:59:59Z`);

    const rt: RateType = ((rev as { rate_type: RateType }).rate_type) ?? 'per_minute';
    const rate = Number((rev as { rate_amount: string | number }).rate_amount ?? 0);
    const units = computeUnits(rt, (results ?? []) as ResultRow[]);
    const amount = Math.round(units * rate * 100) / 100;

    const { data, error } = await supabaseAdmin
      .from('reviewer_payouts')
      .insert({
        reviewer_id,
        period_start,
        period_end,
        unit_type: rt,
        units,
        rate_amount: rate,
        amount,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('[payouts] insert error:', error);
      return NextResponse.json({ error: 'DB_ERROR' }, { status: 500 });
    }
    return NextResponse.json({ data });
  } catch (err) {
    console.error('[API] POST /api/payouts error:', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
