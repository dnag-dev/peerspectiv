import { NextRequest, NextResponse } from 'next/server';

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
  const cookieRaw = req.cookies.get('demo_user')?.value;
  if (cookieRaw) {
    try {
      const parsed = JSON.parse(cookieRaw);
      if (parsed?.email) return `demo:${parsed.email}`;
    } catch { /* malformed cookie */ }
  }
  return null;
}

/**
 * GET /api/payouts/current-period
 * → { period_start: 'YYYY-MM-DD', period_end: 'YYYY-MM-DD' }
 *
 * period_end = 2nd-to-last business day of the current month.
 * period_start = previous period's end + 1 day (where previous period
 * is the same rule applied to the prior month).
 */

function fmt(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function isWeekend(d: Date): boolean {
  const day = d.getUTCDay();
  return day === 0 || day === 6;
}

/** Last business day of the month containing `d` (uses UTC). */
function lastBusinessDay(year: number, month: number): Date {
  // month is 0-indexed. Day 0 of (month+1) = last day of month.
  const d = new Date(Date.UTC(year, month + 1, 0));
  while (isWeekend(d)) {
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return d;
}

/** Previous business day before `d`. */
function prevBusinessDay(d: Date): Date {
  const out = new Date(d.getTime());
  out.setUTCDate(out.getUTCDate() - 1);
  while (isWeekend(out)) {
    out.setUTCDate(out.getUTCDate() - 1);
  }
  return out;
}

/** 2nd-to-last business day of the given (year, month). */
function secondToLastBusinessDay(year: number, month: number): Date {
  return prevBusinessDay(lastBusinessDay(year, month));
}

export async function GET(req: NextRequest) {
  const userId = await getAdminUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth();

    const periodEnd = secondToLastBusinessDay(y, m);

    // Previous period end = same rule for prior month
    const prevYear = m === 0 ? y - 1 : y;
    const prevMonth = m === 0 ? 11 : m - 1;
    const prevEnd = secondToLastBusinessDay(prevYear, prevMonth);

    // period_start = prevEnd + 1 calendar day
    const periodStart = new Date(prevEnd.getTime());
    periodStart.setUTCDate(periodStart.getUTCDate() + 1);

    return NextResponse.json({
      period_start: fmt(periodStart),
      period_end: fmt(periodEnd),
    });
  } catch (err) {
    console.error('[API] GET /api/payouts/current-period error:', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
