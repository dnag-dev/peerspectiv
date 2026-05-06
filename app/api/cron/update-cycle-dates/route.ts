import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { companies, tags } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import {
  buildCadencePeriods,
  getNextPeriodStartDate,
  type CadenceConfig,
  type CadencePeriod,
} from '@/lib/cadence/core';

export const dynamic = 'force-dynamic';

/**
 * Daily cron — Phase 9A
 *
 * For each active company with cadence config:
 * 1. Compute current + next period from buildCadencePeriods()
 * 2. Set next_cycle_due = next period start date
 * 3. Create cadence tags (find-or-create) for current AND next period
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized', code: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  try {
    // Fetch all active companies with cadence config
    const rows = await db
      .select({
        id: companies.id,
        name: companies.name,
        cadencePeriodType: companies.cadencePeriodType,
        fiscalYearStartMonth: companies.fiscalYearStartMonth,
        cadencePeriodMonths: companies.cadencePeriodMonths,
      })
      .from(companies)
      .where(eq(companies.status, 'active'));

    const now = new Date();
    let updated = 0;
    let tagsCreated = 0;

    for (const company of rows) {
      const config: CadenceConfig = {
        fiscalYearStartMonth: company.fiscalYearStartMonth ?? 1,
        type: (company.cadencePeriodType ?? 'quarterly') as CadenceConfig['type'],
        customMonths: company.cadencePeriodMonths ?? undefined,
      };

      // Compute next period start date
      const nextStart = getNextPeriodStartDate(config, now);

      // Update next_cycle_due
      await db
        .update(companies)
        .set({ nextCycleDue: nextStart, updatedAt: now })
        .where(eq(companies.id, company.id));
      updated++;

      // Create cadence tags for current + next period (find-or-create)
      const periods = buildCadencePeriods(config, now, 0);
      const currentPeriod = periods[periods.length - 1];

      // Also build next period by advancing reference date past current end
      const nextRefDate = new Date(currentPeriod.end_date + 'T00:00:00Z');
      nextRefDate.setUTCDate(nextRefDate.getUTCDate() + 1);
      const nextPeriods = buildCadencePeriods(config, nextRefDate, 0);
      const nextPeriod = nextPeriods[nextPeriods.length - 1];

      for (const period of [currentPeriod, nextPeriod]) {
        if (!period?.label) continue;
        // Find-or-create cadence tag
        const existing = await db
          .select({ id: tags.id })
          .from(tags)
          .where(
            sql`${tags.scope} = 'cadence' AND ${tags.companyId} = ${company.id} AND ${tags.periodLabel} = ${period.label}`
          )
          .limit(1);

        if (existing.length === 0) {
          await db.insert(tags).values({
            name: period.label,
            scope: 'cadence',
            companyId: company.id,
            periodLabel: period.label,
            color: 'amber',
            createdBy: 'cron:update-cycle-dates',
          });
          tagsCreated++;
        }
      }
    }

    return NextResponse.json({
      ok: true,
      companies_updated: updated,
      tags_created: tagsCreated,
      timestamp: now.toISOString(),
    });
  } catch (err) {
    console.error('[cron/update-cycle-dates] failed:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
