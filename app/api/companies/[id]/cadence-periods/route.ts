import { NextRequest, NextResponse } from 'next/server';
import { getCompanyCadencePeriods } from '@/lib/cadence/periods';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const lookbackParam = new URL(_req.url).searchParams.get('lookback_years');
    const lookbackYears = lookbackParam ? Math.max(0, Math.min(5, Number(lookbackParam))) : 2;
    const periods = await getCompanyCadencePeriods(params.id, lookbackYears);
    return NextResponse.json({ periods });
  } catch (err) {
    console.error('[api/companies/cadence-periods] failed:', err);
    return NextResponse.json({ error: 'Failed to load cadence periods' }, { status: 500 });
  }
}
