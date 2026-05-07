import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { buildCadencePeriods } from '@/lib/cadence/core';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const companyId = new URL(req.url).searchParams.get('id') || '166423d0-54e7-4b94-8c3e-0b86abbc3d0e';

  const result = await db.execute(sql`
    SELECT fiscal_year_start_month, cadence_period_type, cadence_period_months
    FROM companies WHERE id = ${companyId} LIMIT 1
  `);
  const rows = ((result as any).rows ?? result) as any[];
  const row = rows?.[0];

  const config = {
    fiscalYearStartMonth: row?.fiscal_year_start_month ?? 1,
    type: (row?.cadence_period_type ?? 'quarterly') as any,
    customMonths: row?.cadence_period_months ?? undefined,
  };

  const now = new Date();
  const periods = buildCadencePeriods(config, now, 1);

  // Show a safe portion of the DB URL for debugging (host only, no password)
  const dbUrl = process.env.DATABASE_URL || '';
  const dbHost = dbUrl.match(/@([^/]+)\//)?.[1] || 'unknown';

  return NextResponse.json({
    dbHost,
    dbRow: row,
    config,
    todayUTC: { year: now.getUTCFullYear(), month: now.getUTCMonth() },
    todayLocal: { year: now.getFullYear(), month: now.getMonth() },
    fiscalStart: config.fiscalYearStartMonth - 1,
    periods: periods.slice(-3),
  });
}
