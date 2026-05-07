/**
 * Cadence period helpers — Phase 3.1.
 *
 * Server-side wrappers around the pure logic in ./core.ts.
 * This file imports `db` and is server-only.
 */

import { db } from '@/lib/db';
import { companies } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import {
  buildCadencePeriods,
  findPeriodForDate,
  formatCadenceLabel,
  type CadencePeriod,
  type CadenceConfig,
} from './core';

// Re-export everything from core so existing server-side imports still work.
export {
  buildCadencePeriods,
  findPeriodForDate,
  formatCadenceLabel,
  type CadencePeriod,
  type CadenceConfig,
};

async function readCompanyCadence(companyId: string) {
  const [row] = await db
    .select({
      fiscalYearStartMonth: companies.fiscalYearStartMonth,
      cadencePeriodType: companies.cadencePeriodType,
      cadencePeriodMonths: companies.cadencePeriodMonths,
    })
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1);
  return row ?? null;
}

/**
 * Return all cadence periods that cover roughly the last `lookbackYears` years
 * up through the period that contains today. Ordered oldest → newest.
 */
export async function getCompanyCadencePeriods(
  companyId: string,
  lookbackYears: number = 2
): Promise<CadencePeriod[]> {
  const row = await readCompanyCadence(companyId);
  return buildCadencePeriods(
    {
      fiscalYearStartMonth: row?.fiscalYearStartMonth ?? 1,
      type: (row?.cadencePeriodType ?? 'quarterly') as CadencePeriod['type'],
      customMonths: row?.cadencePeriodMonths ?? undefined,
    },
    new Date(),
    lookbackYears
  );
}

export async function getCurrentCadencePeriod(
  companyId: string,
  encounterDate?: string | Date | null
): Promise<CadencePeriod> {
  // Phase 6.4 — when an encounterDate is supplied (e.g. AI auto-tag at chart
  // upload), pick the period whose [start, end] window contains it. Falls back
  // to "today's period" (last entry) when no date matches or none supplied.
  // Use a 5-year lookback so older encounter dates still resolve.
  const all = await getCompanyCadencePeriods(companyId, 5);
  if (encounterDate) {
    const dStr =
      encounterDate instanceof Date
        ? encounterDate.toISOString().slice(0, 10)
        : String(encounterDate).slice(0, 10);
    return findPeriodForDate(all, dStr);
  }
  return all[all.length - 1];
}
