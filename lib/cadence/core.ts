/**
 * Pure cadence period helpers — no DB, no server-only imports.
 * Safe to import from both server and client components.
 *
 * SA-013E label format (must match Ashton's example PDFs EXACTLY):
 *   - Quarterly:        `Q1 2026`
 *   - Monthly:          `Jan 2026`  (3-letter Title Case)
 *   - Custom span:      `Jan – Mar 2026`  (en-dash U+2013, surrounding spaces)
 *   - Cross-year span:  `Nov 2025 – Feb 2026`
 *
 * The en-dash is U+2013 (UTF-8 0xE2 0x80 0x93) — NOT a hyphen-minus (0x2D).
 */

export interface CadencePeriod {
  label: string;
  start_date: string; // ISO YYYY-MM-DD
  end_date: string; // ISO YYYY-MM-DD
  type: 'quarterly' | 'monthly' | 'custom_multi_month' | 'random';
}

export interface CadenceConfig {
  /** 1..12, calendar month number. Default 1 (January). */
  fiscalYearStartMonth: number;
  type: CadencePeriod['type'];
  /** Only used when type = 'custom_multi_month'. Clamped to 2..12. */
  customMonths?: number;
}

const MONTH_ABBR = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const EN_DASH = '–';
const SPAN_SEP = ` ${EN_DASH} `;

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function isoDate(year: number, monthIdx0: number, day: number): string {
  return `${year}-${pad2(monthIdx0 + 1)}-${pad2(day)}`;
}

function lastDayOfMonth(year: number, monthIdx0: number): number {
  return new Date(Date.UTC(year, monthIdx0 + 1, 0)).getUTCDate();
}

/**
 * Build the canonical label for a period given its start/end and type.
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

  if (sYear === eYear && sMonth === eMonth) {
    return `${MONTH_ABBR[sMonth]} ${sYear}`;
  }
  if (sYear === eYear) {
    return `${MONTH_ABBR[sMonth]}${SPAN_SEP}${MONTH_ABBR[eMonth]} ${eYear}`;
  }
  return `${MONTH_ABBR[sMonth]} ${sYear}${SPAN_SEP}${MONTH_ABBR[eMonth]} ${eYear}`;
}

/**
 * Pure function: build cadence periods given a config and a reference date.
 * Returns periods covering `lookbackYears` years back through the period
 * that contains `referenceDate`. Ordered oldest → newest.
 */
export function buildCadencePeriods(
  config: CadenceConfig,
  referenceDate: Date,
  lookbackYears: number = 2
): CadencePeriod[] {
  const fiscalStart = (config.fiscalYearStartMonth - 1);
  const type: CadencePeriod['type'] = config.type === 'random' ? 'quarterly' : config.type;
  const customMonths = Math.max(2, Math.min(12, config.customMonths ?? 3));

  const todayY = referenceDate.getUTCFullYear();
  const todayM = referenceDate.getUTCMonth();

  const periods: CadencePeriod[] = [];

  if (type === 'monthly') {
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
    const monthsSinceFiscalStart = ((todayM - fiscalStart) + 12) % 12;
    const currentQIdx = Math.floor(monthsSinceFiscalStart / 3);
    const currentQStartMonthOfYear = (fiscalStart + currentQIdx * 3) % 12;
    const currentQStartYear =
      currentQStartMonthOfYear > todayM ? todayY - 1 : todayY;

    const totalQuarters = lookbackYears * 4 + 1;
    for (let back = totalQuarters - 1; back >= 0; back -= 1) {
      const offsetMonths = -back * 3;
      const startCursor = currentQStartYear * 12 + currentQStartMonthOfYear + offsetMonths;
      const sy = Math.floor(startCursor / 12);
      const sm = ((startCursor % 12) + 12) % 12;
      const monthsFromFY = ((sm - fiscalStart) + 12) % 12;
      const qNum = Math.floor(monthsFromFY / 3) + 1;
      const endMonthCursor = startCursor + 2;
      const ey = Math.floor(endMonthCursor / 12);
      const em = ((endMonthCursor % 12) + 12) % 12;
      const start = isoDate(sy, sm, 1);
      const end = isoDate(ey, em, lastDayOfMonth(ey, em));
      const labelYear = sy;
      periods.push({
        label: `Q${qNum} ${labelYear}`,
        start_date: start,
        end_date: end,
        type: 'quarterly',
      });
    }
    return periods;
  }

  // custom_multi_month
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

/**
 * Find the period in a list that contains the given date.
 * Falls back to the last period if no match.
 */
export function findPeriodForDate(
  periods: CadencePeriod[],
  dateStr: string
): CadencePeriod {
  const d = dateStr.slice(0, 10);
  return periods.find((p) => p.start_date <= d && d <= p.end_date) ?? periods[periods.length - 1];
}
