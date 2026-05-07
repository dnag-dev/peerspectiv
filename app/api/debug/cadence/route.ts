import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { companies } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { buildCadencePeriods } from '@/lib/cadence/core';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const companyId = new URL(req.url).searchParams.get('id') || '166423d0-54e7-4b94-8c3e-0b86abbc3d0e';

  const [row] = await db
    .select({
      fiscalYearStartMonth: companies.fiscalYearStartMonth,
      cadencePeriodType: companies.cadencePeriodType,
      cadencePeriodMonths: companies.cadencePeriodMonths,
    })
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1);

  const config = {
    fiscalYearStartMonth: row?.fiscalYearStartMonth ?? 1,
    type: (row?.cadencePeriodType ?? 'quarterly') as any,
    customMonths: row?.cadencePeriodMonths ?? undefined,
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
