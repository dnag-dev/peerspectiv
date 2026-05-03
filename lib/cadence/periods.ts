/**
 * Cadence period helpers — Phase 3.1.
 *
 * Reads `companies.fiscal_year_start_month` (default 1) and
 * `companies.cadence_period_type` ('quarterly' | 'monthly' |
 * 'custom_multi_month' | 'random'). For 'custom_multi_month' also reads
 * `companies.cadence_period_months`.
 *
 * SA-013E label format (must match Ashton's example PDFs EXACTLY):
 *   - Quarterly:        `Q1 2026`
 *   - Monthly:          `Jan 2026`  (3-letter Title Case)
 *   - Custom span:      `Jan – Mar 2026`  (en-dash U+2013, surrounding spaces)
 *   - Cross-year span:  `Nov 2025 – Feb 2026`
 *
 * The en-dash is U+2013 (UTF-8 0xE2 0x80 0x93) — NOT a hyphen-minus (0x2D).
 */

import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export interface CadencePeriod {
  label: string;
  start_date: string; // ISO YYYY-MM-DD
  end_date: string; // ISO YYYY-MM-DD
  type: 'quarterly' | 'monthly' | 'custom_multi_month' | 'random';
}

const MONTH_ABBR = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

// U+2013 EN DASH with surrounding ASCII spaces. Source it as a constant so
// no editor / autoformatter ever rewrites it to a hyphen-minus.
const EN_DASH = '–';
const SPAN_SEP = ` ${EN_DASH} `;

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function isoDate(year: number, monthIdx0: number, day: number): string {
  return `${year}-${pad2(monthIdx0 + 1)}-${pad2(day)}`;
}

function lastDayOfMonth(year: number, monthIdx0: number): number {
  // Day 0 of next month = last day of this month.
  return new Date(Date.UTC(year, monthIdx0 + 1, 0)).getUTCDate();
}

/**
 * Build the canonical label for a period given its start/end and type.
 * For quarterly/monthly the start date alone determines the label.
 * For custom_multi_month / random the span format is used.
 */
export function formatCadenceLabel(period: CadencePeriod): string {
  if (period.label) return period.label;
  const start = new Date(period.start_date + 'T00:00:00Z');
  const end = new Date(period.end_date + 'T00:00:00Z');
  const sMonth = start.getUTCMonth();
  const sYear = start.getUTCFullYear();
  const eMonth = end.getUTCMonth();
  const eYear = end.getUTCFullYear();

  if (period.type === 'quarterly') {
    const q = Math.floor(sMonth / 3) + 1;
    return `Q${q} ${sYear}`;
  }

  if (period.type === 'monthly') {
    return `${MONTH_ABBR[sMonth]} ${sYear}`;
  }

  // custom_multi_month or random — always render as span
  if (sYear === eYear && sMonth === eMonth) {
    return `${MONTH_ABBR[sMonth]} ${sYear}`;
  }
  if (sYear === eYear) {
    return `${MONTH_ABBR[sMonth]}${SPAN_SEP}${MONTH_ABBR[eMonth]} ${eYear}`;
  }
  return `${MONTH_ABBR[sMonth]} ${sYear}${SPAN_SEP}${MONTH_ABBR[eMonth]} ${eYear}`;
}

interface CompanyCadenceRow extends Record<string, unknown> {
  fiscal_year_start_month: number | null;
  cadence_period_type: string | null;
  cadence_period_months: number | null;
}

async function readCompanyCadence(companyId: string): Promise<CompanyCadenceRow | null> {
  const result = await db.execute<CompanyCadenceRow>(sql`
    SELECT fiscal_year_start_month, cadence_period_type, cadence_period_months
    FROM companies WHERE id = ${companyId} LIMIT 1
  `);
  const rows =
    ((result as unknown as { rows?: CompanyCadenceRow[] }).rows as CompanyCadenceRow[] | undefined) ??
    (result as unknown as CompanyCadenceRow[]);
  return rows?.[0] ?? null;
}

/**
 * Return all cadence periods that cover roughly the last `lookbackYears` years
 * up through the period that contains today. Ordered oldest → newest.
 *
 * For 'random' (no fixed cadence — invoice triggered ad-hoc) we fall back to
 * quarterly buckets so the picker still has something to snap to. Callers that
 * need true ad-hoc dates should use the date range API directly.
 */
export async function getCompanyCadencePeriods(
  companyId: string,
  lookbackYears: number = 2
): Promise<CadencePeriod[]> {
  const row = await readCompanyCadence(companyId);
  const fiscalStart = (row?.fiscal_year_start_month ?? 1) - 1; // 0..11
  const rawType = (row?.cadence_period_type ?? 'quarterly') as CadencePeriod['type'];
  const type: CadencePeriod['type'] = rawType === 'random' ? 'quarterly' : rawType;
  const customMonths = Math.max(2, Math.min(12, row?.cadence_period_months ?? 3));

  const today = new Date();
  const todayY = today.getUTCFullYear();
  const todayM = today.getUTCMonth();

  const periods: CadencePeriod[] = [];

  if (type === 'monthly') {
    // Walk from (lookbackYears * 12) months back to current month, inclusive.
    const totalMonths = lookbackYears * 12 + 1;
    const startCursorMonth = todayY * 12 + todayM - (totalMonths - 1);
    for (let i = 0; i < totalMonths; i += 1) {
      const m = startCursorMonth + i;
      const y = Math.floor(m / 12);
      const mi = ((m % 12) + 12) % 12;
      const start = isoDate(y, mi, 1);
      const end = isoDate(y, mi, lastDayOfMonth(y, mi));
      periods.push({
        label: `${MONTH_ABBR[mi]} ${y}`,
        start_date: start,
        end_date: end,
        type: 'monthly',
      });
    }
    return periods;
  }

  if (type === 'quarterly') {
    // Quarters are aligned to fiscalStart: each quarter starts at
    //   month = fiscalStart + 3*qIdx (mod 12).
    // The "current" quarter is whichever contains today. Then walk back.
    const monthsSinceFiscalStart = ((todayM - fiscalStart) + 12) % 12;
    const currentQIdx = Math.floor(monthsSinceFiscalStart / 3); // 0..3
    // The actual calendar month where the current quarter began:
    const currentQStartMonthOfYear = (fiscalStart + currentQIdx * 3) % 12;
    const currentQStartYear =
      currentQStartMonthOfYear > todayM ? todayY - 1 : todayY;

    const totalQuarters = lookbackYears * 4 + 1;
    for (let back = totalQuarters - 1; back >= 0; back -= 1) {
      // fiscal-quarter index counted globally
      const globalQ = (currentQStartYear * 4 + currentQIdx) - back;
      // Compute the calendar start month/year for this offset
      const offsetMonths = -back * 3;
      const startCursor = currentQStartYear * 12 + currentQStartMonthOfYear + offsetMonths;
      const sy = Math.floor(startCursor / 12);
      const sm = ((startCursor % 12) + 12) % 12;
      // q label is 1..4 within the fiscal year
      const monthsFromFY = ((sm - fiscalStart) + 12) % 12;
      const qNum = Math.floor(monthsFromFY / 3) + 1;
      // Fiscal year label = the calendar year containing the FY start month
      const fyLabelYear = sm < fiscalStart ? sy - 1 : sy;
      const fyDisplayYear = fiscalStart === 0 ? sy : fyLabelYear + 1; // FY ending year if non-Jan
      const labelYear = fiscalStart === 0 ? sy : fyDisplayYear;
      const endMonthCursor = startCursor + 2;
      const ey = Math.floor(endMonthCursor / 12);
      const em = ((endMonthCursor % 12) + 12) % 12;
      const start = isoDate(sy, sm, 1);
      const end = isoDate(ey, em, lastDayOfMonth(ey, em));
      periods.push({
        label: `Q${qNum} ${labelYear}`,
        start_date: start,
        end_date: end,
        type: 'quarterly',
      });
      // suppress unused warning
      void globalQ;
    }
    return periods;
  }

  // custom_multi_month: walk back N-month buckets aligned to fiscalStart
  const bucketSize = customMonths;
  const monthsSinceFiscalStart = ((todayM - fiscalStart) + 12) % 12;
  const currentBucketIdx = Math.floor(monthsSinceFiscalStart / bucketSize);
  const currentBucketStartMonthOfYear = (fiscalStart + currentBucketIdx * bucketSize) % 12;
  const currentBucketStartYear =
    currentBucketStartMonthOfYear > todayM ? todayY - 1 : todayY;
  const totalBuckets = Math.ceil((lookbackYears * 12) / bucketSize) + 1;
  for (let back = totalBuckets - 1; back >= 0; back -= 1) {
    const startCursor =
      currentBucketStartYear * 12 + currentBucketStartMonthOfYear - back * bucketSize;
    const sy = Math.floor(startCursor / 12);
    const sm = ((startCursor % 12) + 12) % 12;
    const endCursor = startCursor + bucketSize - 1;
    const ey = Math.floor(endCursor / 12);
    const em = ((endCursor % 12) + 12) % 12;
    const start = isoDate(sy, sm, 1);
    const end = isoDate(ey, em, lastDayOfMonth(ey, em));
    const period: CadencePeriod = {
      label: '',
      start_date: start,
      end_date: end,
      type: 'custom_multi_month',
    };
    period.label = formatCadenceLabel(period);
    periods.push(period);
  }
  return periods;
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
    const match = all.find((p) => p.start_date <= dStr && dStr <= p.end_date);
    if (match) return match;
  }
  return all[all.length - 1];
}
