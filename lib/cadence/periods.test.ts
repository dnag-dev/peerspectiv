import { describe, it, expect } from 'vitest';
import { formatCadenceLabel, type CadencePeriod } from './periods';

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
    expect(label).toBe('Jan – Mar 2026');

    // Byte-level assertion: en-dash is encoded as 0xE2 0x80 0x93 in UTF-8.
    const bytes = Buffer.from(label, 'utf8');
    let foundEnDash = false;
    for (let i = 0; i < bytes.length - 2; i += 1) {
      if (bytes[i] === 0xe2 && bytes[i + 1] === 0x80 && bytes[i + 2] === 0x93) {
        foundEnDash = true;
        break;
      }
    }
    expect(foundEnDash).toBe(true);

    // Must NOT contain a hyphen-minus (0x2D) as the separator.
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
    expect(label).toBe('Nov 2025 – Feb 2026');
    expect(label).toMatch(/^[A-Z][a-z]{2} \d{4} – [A-Z][a-z]{2} \d{4}$/);
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
