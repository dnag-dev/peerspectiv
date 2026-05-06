import { describe, it, expect } from 'vitest';
import {
  formatCadenceLabel,
  buildCadencePeriods,
  findPeriodForDate,
  getNextPeriodStartDate,
  type CadencePeriod,
  type CadenceConfig,
} from './core';

// ─── Helper ────────────────────────────────────────────────────────────────
function utc(iso: string): Date {
  return new Date(iso + 'T00:00:00Z');
}

// ─── formatCadenceLabel ────────────────────────────────────────────────────
describe('formatCadenceLabel', () => {
  it('formats quarterly labels as "Q# YYYY"', () => {
    const periods: CadencePeriod[] = [
      { label: '', start_date: '2026-01-01', end_date: '2026-03-31', type: 'quarterly' },
      { label: '', start_date: '2026-04-01', end_date: '2026-06-30', type: 'quarterly' },
      { label: '', start_date: '2026-07-01', end_date: '2026-09-30', type: 'quarterly' },
      { label: '', start_date: '2026-10-01', end_date: '2026-12-31', type: 'quarterly' },
    ];
    const labels = periods.map(formatCadenceLabel);
    expect(labels).toEqual(['Q1 2026', 'Q2 2026', 'Q3 2026', 'Q4 2026']);
    for (const l of labels) {
      expect(l).toMatch(/^Q[1-4] \d{4}$/);
    }
  });

  it('formats monthly labels as "Mon YYYY" with 3-letter Title Case', () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    months.forEach((m, idx) => {
      const period: CadencePeriod = {
        label: '',
        start_date: `2026-${String(idx + 1).padStart(2, '0')}-01`,
        end_date: `2026-${String(idx + 1).padStart(2, '0')}-28`,
        type: 'monthly',
      };
      const label = formatCadenceLabel(period);
      expect(label).toBe(`${m} 2026`);
      expect(label).toMatch(/^[A-Z][a-z]{2} \d{4}$/);
    });
  });

  it('formats custom_multi_month labels with U+2013 en-dash (NOT hyphen-minus)', () => {
    const period: CadencePeriod = {
      label: '',
      start_date: '2026-01-01',
      end_date: '2026-03-31',
      type: 'custom_multi_month',
    };
    const label = formatCadenceLabel(period);
    expect(label).toBe('Jan \u2013 Mar 2026');
    expect(label.includes(' - ')).toBe(false);
  });

  it('formats cross-year span as "Mon YYYY – Mon YYYY"', () => {
    const period: CadencePeriod = {
      label: '',
      start_date: '2025-11-01',
      end_date: '2026-02-28',
      type: 'custom_multi_month',
    };
    const label = formatCadenceLabel(period);
    expect(label).toBe('Nov 2025 \u2013 Feb 2026');
  });

  it('uses preserved label when already set', () => {
    const period: CadencePeriod = {
      label: 'CustomLabel',
      start_date: '2026-01-01',
      end_date: '2026-03-31',
      type: 'quarterly',
    };
    expect(formatCadenceLabel(period)).toBe('CustomLabel');
  });
});

// ─── SA-063A: Quarterly cadence with fiscal year start ─────────────────────
describe('buildCadencePeriods — SA-063A Quarterly', () => {
  const may2 = utc('2026-05-02');

  it('Company A (FY-Jan Quarterly): current period = Q2 2026, sequence Q1–Q4 all 2026', () => {
    const config: CadenceConfig = {
      fiscalYearStartMonth: 1,
      type: 'quarterly',
    };
    const periods = buildCadencePeriods(config, may2, 0);
    // lookback=0 gives just the current period
    expect(periods).toHaveLength(1);
    expect(periods[0].label).toBe('Q2 2026');
    expect(periods[0].start_date).toBe('2026-04-01');
    expect(periods[0].end_date).toBe('2026-06-30');
  });

  it('Company A (FY-Jan Quarterly): full FY 2026 sequence', () => {
    const config: CadenceConfig = {
      fiscalYearStartMonth: 1,
      type: 'quarterly',
    };
    const periods = buildCadencePeriods(config, may2, 1);
    const labels = periods.map((p) => p.label);
    // Should include Q2 2025 through Q2 2026 (lookback=1 = 5 quarters)
    expect(labels).toContain('Q1 2026');
    expect(labels).toContain('Q2 2026');

    // Verify Q1 2026 dates
    const q1 = periods.find((p) => p.label === 'Q1 2026')!;
    expect(q1.start_date).toBe('2026-01-01');
    expect(q1.end_date).toBe('2026-03-31');

    // Verify Q2 2026 dates
    const q2 = periods.find((p) => p.label === 'Q2 2026')!;
    expect(q2.start_date).toBe('2026-04-01');
    expect(q2.end_date).toBe('2026-06-30');
  });

  it('Company B (FY-Apr Quarterly): current period = Q1 2026 on May 2, 2026', () => {
    const config: CadenceConfig = {
      fiscalYearStartMonth: 4,
      type: 'quarterly',
    };
    const periods = buildCadencePeriods(config, may2, 0);
    expect(periods).toHaveLength(1);
    expect(periods[0].label).toBe('Q1 2026');
    expect(periods[0].start_date).toBe('2026-04-01');
    expect(periods[0].end_date).toBe('2026-06-30');
  });

  it('Company B (FY-Apr Quarterly): Q4 = Jan–Mar 2027 (cross-year boundary)', () => {
    const config: CadenceConfig = {
      fiscalYearStartMonth: 4,
      type: 'quarterly',
    };
    // Check from Jan 15 2027 — that should be in Q4
    const jan2027 = utc('2027-01-15');
    const periods = buildCadencePeriods(config, jan2027, 1);
    const q4 = periods.find((p) => p.label === 'Q4 2027')!;
    expect(q4).toBeDefined();
    expect(q4.start_date).toBe('2027-01-01');
    expect(q4.end_date).toBe('2027-03-31');
  });

  it('Company FY-Mar Quarterly: May 4 2026 = Q1, Q1 starts in March', () => {
    const config: CadenceConfig = {
      fiscalYearStartMonth: 3,
      type: 'quarterly',
    };
    const may4 = utc('2026-05-04');
    const periods = buildCadencePeriods(config, may4, 1);
    const current = periods[periods.length - 1];

    // FY starts March → Q1 = Mar–May, Q2 = Jun–Aug, Q3 = Sep–Nov, Q4 = Dec–Feb
    expect(current.label).toBe('Q1 2026');
    expect(current.start_date).toBe('2026-03-01');
    expect(current.end_date).toBe('2026-05-31');
  });

  it('SA-063A boundary: same date maps to different labels per company FY', () => {
    const config_jan: CadenceConfig = { fiscalYearStartMonth: 1, type: 'quarterly' };
    const config_apr: CadenceConfig = { fiscalYearStartMonth: 4, type: 'quarterly' };

    const periodsJan = buildCadencePeriods(config_jan, may2, 0);
    const periodsApr = buildCadencePeriods(config_apr, may2, 0);

    // May 2 in FY-Jan = Q2 2026
    expect(periodsJan[periodsJan.length - 1].label).toBe('Q2 2026');
    // May 2 in FY-Apr = Q1 2026
    expect(periodsApr[periodsApr.length - 1].label).toBe('Q1 2026');
  });
});

// ─── SA-063B: Monthly cadence with fiscal year start ──────────────────────
describe('buildCadencePeriods — SA-063B Monthly', () => {
  const may2 = utc('2026-05-02');

  it('Company A (FY-Jan Monthly): current period = May 2026', () => {
    const config: CadenceConfig = {
      fiscalYearStartMonth: 1,
      type: 'monthly',
    };
    const periods = buildCadencePeriods(config, may2, 0);
    expect(periods).toHaveLength(1);
    expect(periods[0].label).toBe('May 2026');
    expect(periods[0].start_date).toBe('2026-05-01');
    expect(periods[0].end_date).toBe('2026-05-31');
  });

  it('Company A (FY-Jan Monthly): full FY 2026 has all 12 months stamped 2026', () => {
    const config: CadenceConfig = {
      fiscalYearStartMonth: 1,
      type: 'monthly',
    };
    const periods = buildCadencePeriods(config, may2, 1);
    const labels = periods.map((p) => p.label);
    // Jan–May 2026 should all be present (May is current + 4 lookback months in this year)
    expect(labels).toContain('Jan 2026');
    expect(labels).toContain('Feb 2026');
    expect(labels).toContain('Mar 2026');
    expect(labels).toContain('Apr 2026');
    expect(labels).toContain('May 2026');
  });

  it('Company B (FY-Apr Monthly): current period = May 2026', () => {
    const config: CadenceConfig = {
      fiscalYearStartMonth: 4,
      type: 'monthly',
    };
    const periods = buildCadencePeriods(config, may2, 0);
    expect(periods).toHaveLength(1);
    expect(periods[0].label).toBe('May 2026');
  });

  it('Company B (FY-Apr Monthly): Jan 2027 label uses calendar year 2027', () => {
    const config: CadenceConfig = {
      fiscalYearStartMonth: 4,
      type: 'monthly',
    };
    const jan2027 = utc('2027-01-15');
    const periods = buildCadencePeriods(config, jan2027, 0);
    expect(periods[0].label).toBe('Jan 2027');
  });

  it('SA-063B boundary: both companies tag May 2 2026 as "May 2026"', () => {
    const config_jan: CadenceConfig = { fiscalYearStartMonth: 1, type: 'monthly' };
    const config_apr: CadenceConfig = { fiscalYearStartMonth: 4, type: 'monthly' };

    const pJan = buildCadencePeriods(config_jan, may2, 0);
    const pApr = buildCadencePeriods(config_apr, may2, 0);

    expect(pJan[0].label).toBe('May 2026');
    expect(pApr[0].label).toBe('May 2026');
  });
});

// ─── SA-063C: Custom multi-month with fiscal year start ───────────────────
describe('buildCadencePeriods — SA-063C Custom Multi-Month', () => {
  const may2 = utc('2026-05-02');

  it('Bi-monthly (2-month, FY-Jan): current period = May – Jun 2026', () => {
    const config: CadenceConfig = {
      fiscalYearStartMonth: 1,
      type: 'custom_multi_month',
      customMonths: 2,
    };
    const periods = buildCadencePeriods(config, may2, 0);
    expect(periods).toHaveLength(1);
    expect(periods[0].label).toBe('May \u2013 Jun 2026');
    expect(periods[0].start_date).toBe('2026-05-01');
    expect(periods[0].end_date).toBe('2026-06-30');
  });

  it('Bi-monthly (2-month, FY-Jan): full FY 2026 sequence', () => {
    const config: CadenceConfig = {
      fiscalYearStartMonth: 1,
      type: 'custom_multi_month',
      customMonths: 2,
    };
    const dec31 = utc('2026-12-31');
    const periods = buildCadencePeriods(config, dec31, 1);
    const labels = periods.map((p) => p.label);
    expect(labels).toContain('Jan \u2013 Feb 2026');
    expect(labels).toContain('Mar \u2013 Apr 2026');
    expect(labels).toContain('May \u2013 Jun 2026');
    expect(labels).toContain('Jul \u2013 Aug 2026');
    expect(labels).toContain('Sep \u2013 Oct 2026');
    expect(labels).toContain('Nov \u2013 Dec 2026');
  });

  it('5-month (FY-Apr): current period = April – Aug 2026 on May 2', () => {
    const config: CadenceConfig = {
      fiscalYearStartMonth: 4,
      type: 'custom_multi_month',
      customMonths: 5,
    };
    const periods = buildCadencePeriods(config, may2, 0);
    expect(periods).toHaveLength(1);
    expect(periods[0].label).toBe('Apr \u2013 Aug 2026');
    expect(periods[0].start_date).toBe('2026-04-01');
    expect(periods[0].end_date).toBe('2026-08-31');
  });

  it('5-month (FY-Apr): period 2 crosses calendar year = Sep 2026 – Jan 2027', () => {
    const config: CadenceConfig = {
      fiscalYearStartMonth: 4,
      type: 'custom_multi_month',
      customMonths: 5,
    };
    const oct2026 = utc('2026-10-15');
    const periods = buildCadencePeriods(config, oct2026, 1);
    const currentPeriod = periods[periods.length - 1];
    expect(currentPeriod.label).toBe('Sep 2026 \u2013 Jan 2027');
    expect(currentPeriod.start_date).toBe('2026-09-01');
    expect(currentPeriod.end_date).toBe('2027-01-31');
  });

  it('6-month (FY-Jan, semi-annual): Jan – Jun 2026, Jul – Dec 2026', () => {
    const config: CadenceConfig = {
      fiscalYearStartMonth: 1,
      type: 'custom_multi_month',
      customMonths: 6,
    };
    const periods = buildCadencePeriods(config, may2, 1);
    const labels = periods.map((p) => p.label);
    expect(labels).toContain('Jan \u2013 Jun 2026');

    const h1 = periods.find((p) => p.label === 'Jan \u2013 Jun 2026')!;
    expect(h1.start_date).toBe('2026-01-01');
    expect(h1.end_date).toBe('2026-06-30');
  });

  it('6-month (FY-Jul, semi-annual): Jul – Dec 2026, Jan – Jun 2027', () => {
    const config: CadenceConfig = {
      fiscalYearStartMonth: 7,
      type: 'custom_multi_month',
      customMonths: 6,
    };
    const aug2026 = utc('2026-08-15');
    const periods = buildCadencePeriods(config, aug2026, 1);
    const currentPeriod = periods[periods.length - 1];
    expect(currentPeriod.label).toBe('Jul \u2013 Dec 2026');
    expect(currentPeriod.start_date).toBe('2026-07-01');
    expect(currentPeriod.end_date).toBe('2026-12-31');
  });

  it('SA-063C boundary: May 2 maps to different periods per config', () => {
    const c_2mo_jan: CadenceConfig = { fiscalYearStartMonth: 1, type: 'custom_multi_month', customMonths: 2 };
    const c_5mo_apr: CadenceConfig = { fiscalYearStartMonth: 4, type: 'custom_multi_month', customMonths: 5 };
    const c_6mo_jan: CadenceConfig = { fiscalYearStartMonth: 1, type: 'custom_multi_month', customMonths: 6 };
    const c_6mo_jul: CadenceConfig = { fiscalYearStartMonth: 7, type: 'custom_multi_month', customMonths: 6 };

    const p1 = buildCadencePeriods(c_2mo_jan, may2, 0);
    const p2 = buildCadencePeriods(c_5mo_apr, may2, 0);
    const p3 = buildCadencePeriods(c_6mo_jan, may2, 0);
    const p4 = buildCadencePeriods(c_6mo_jul, may2, 0);

    expect(p1[0].label).toBe('May \u2013 Jun 2026');
    expect(p2[0].label).toBe('Apr \u2013 Aug 2026');
    expect(p3[0].label).toBe('Jan \u2013 Jun 2026');
    // May 2 with FY-Jul: we're in the Jan-Jun 2026 half (second half of FY 2025)
    expect(p4[0].label).toBe('Jan \u2013 Jun 2026');
  });
});

// ─── findPeriodForDate ────────────────────────────────────────────────────
describe('findPeriodForDate', () => {
  it('finds the correct period for a date within range', () => {
    const config: CadenceConfig = { fiscalYearStartMonth: 1, type: 'quarterly' };
    const periods = buildCadencePeriods(config, utc('2026-12-31'), 1);

    const result = findPeriodForDate(periods, '2026-05-15');
    expect(result.label).toBe('Q2 2026');
  });

  it('falls back to last period when date is out of range', () => {
    const config: CadenceConfig = { fiscalYearStartMonth: 1, type: 'quarterly' };
    const periods = buildCadencePeriods(config, utc('2026-06-01'), 0);

    const result = findPeriodForDate(periods, '2030-01-01');
    expect(result.label).toBe('Q2 2026');
  });
});

// ─── SA-063F: Invalid cadence config validation ──────────────────────────
describe('buildCadencePeriods — SA-063F invalid configs', () => {
  const may2 = utc('2026-05-02');

  it('customMonths = 0 is clamped to 2 (minimum)', () => {
    const config: CadenceConfig = { fiscalYearStartMonth: 1, type: 'custom_multi_month', customMonths: 0 };
    const periods = buildCadencePeriods(config, may2, 0);
    // 0 clamped to 2 → bi-monthly periods
    expect(periods[0].start_date).toBe('2026-05-01');
    expect(periods[0].end_date).toBe('2026-06-30');
  });

  it('customMonths = -1 is clamped to 2 (minimum)', () => {
    const config: CadenceConfig = { fiscalYearStartMonth: 1, type: 'custom_multi_month', customMonths: -1 };
    const periods = buildCadencePeriods(config, may2, 0);
    expect(periods[0].label).toBe('May \u2013 Jun 2026');
  });

  it('customMonths = 13 is clamped to 12 (maximum)', () => {
    const config: CadenceConfig = { fiscalYearStartMonth: 1, type: 'custom_multi_month', customMonths: 13 };
    const periods = buildCadencePeriods(config, may2, 0);
    // 13 clamped to 12 → annual periods starting Jan
    expect(periods[0].label).toBe('Jan \u2013 Dec 2026');
  });

  it('fiscalYearStartMonth works for all 12 months', () => {
    for (let month = 1; month <= 12; month++) {
      const config: CadenceConfig = { fiscalYearStartMonth: month, type: 'quarterly' };
      const periods = buildCadencePeriods(config, may2, 0);
      expect(periods.length).toBeGreaterThan(0);
      expect(periods[0].type).toBe('quarterly');
    }
  });
});

// ─── Edge cases ───────────────────────────────────────────────────────────
describe('buildCadencePeriods — edge cases', () => {
  it('end dates use correct last day of month (Feb leap year)', () => {
    const config: CadenceConfig = { fiscalYearStartMonth: 1, type: 'monthly' };
    // 2028 is a leap year
    const feb2028 = utc('2028-02-15');
    const periods = buildCadencePeriods(config, feb2028, 0);
    expect(periods[0].end_date).toBe('2028-02-29');
  });

  it('end dates use correct last day of month (Feb non-leap year)', () => {
    const config: CadenceConfig = { fiscalYearStartMonth: 1, type: 'monthly' };
    const feb2026 = utc('2026-02-15');
    const periods = buildCadencePeriods(config, feb2026, 0);
    expect(periods[0].end_date).toBe('2026-02-28');
  });

  it('random type falls back to quarterly', () => {
    const config: CadenceConfig = { fiscalYearStartMonth: 1, type: 'random' };
    const periods = buildCadencePeriods(config, utc('2026-05-02'), 0);
    expect(periods[0].label).toBe('Q2 2026');
    expect(periods[0].type).toBe('quarterly');
  });

  it('customMonths clamped: 0 becomes 2, 13 becomes 12', () => {
    const config_low: CadenceConfig = { fiscalYearStartMonth: 1, type: 'custom_multi_month', customMonths: 0 };
    const config_high: CadenceConfig = { fiscalYearStartMonth: 1, type: 'custom_multi_month', customMonths: 13 };

    const p_low = buildCadencePeriods(config_low, utc('2026-05-02'), 0);
    const p_high = buildCadencePeriods(config_high, utc('2026-05-02'), 0);

    // customMonths=0 clamped to 2 → bi-monthly
    expect(p_low[0].label).toBe('May \u2013 Jun 2026');
    // customMonths=13 clamped to 12 → annual
    expect(p_high[0].label).toBe('Jan \u2013 Dec 2026');
  });

  it('periods are ordered oldest → newest', () => {
    const config: CadenceConfig = { fiscalYearStartMonth: 1, type: 'quarterly' };
    const periods = buildCadencePeriods(config, utc('2026-05-02'), 2);
    for (let i = 1; i < periods.length; i++) {
      expect(periods[i].start_date > periods[i - 1].start_date).toBe(true);
    }
  });
});

// ─── getNextPeriodStartDate ───────────────────────────────────────────────
describe('getNextPeriodStartDate', () => {
  it('quarterly FY-Jan: May 2026 → next period starts Jul 1 2026', () => {
    const config: CadenceConfig = { fiscalYearStartMonth: 1, type: 'quarterly' };
    const result = getNextPeriodStartDate(config, utc('2026-05-15'));
    expect(result).toBe('2026-07-01');
  });

  it('quarterly FY-Apr: May 2026 → next period starts Jul 1 2026', () => {
    const config: CadenceConfig = { fiscalYearStartMonth: 4, type: 'quarterly' };
    const result = getNextPeriodStartDate(config, utc('2026-05-15'));
    expect(result).toBe('2026-07-01');
  });

  it('monthly FY-Jan: May 2026 → next period starts Jun 1 2026', () => {
    const config: CadenceConfig = { fiscalYearStartMonth: 1, type: 'monthly' };
    const result = getNextPeriodStartDate(config, utc('2026-05-15'));
    expect(result).toBe('2026-06-01');
  });

  it('bi-monthly FY-Jan: May 2026 (in May-Jun period) → next starts Jul 1', () => {
    const config: CadenceConfig = { fiscalYearStartMonth: 1, type: 'custom_multi_month', customMonths: 2 };
    const result = getNextPeriodStartDate(config, utc('2026-05-15'));
    expect(result).toBe('2026-07-01');
  });

  it('year boundary: Dec 2026 quarterly → next starts Jan 1 2027', () => {
    const config: CadenceConfig = { fiscalYearStartMonth: 1, type: 'quarterly' };
    const result = getNextPeriodStartDate(config, utc('2026-12-15'));
    expect(result).toBe('2027-01-01');
  });
});
