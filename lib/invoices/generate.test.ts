import { describe, it, expect } from 'vitest';
import { computeInvoiceLines, toCents, formatCents } from './generate';

describe('lib/invoices/generate cent math (SA-114)', () => {
  describe('toCents/formatCents', () => {
    it('parses a dollar number as integer cents', () => {
      expect(toCents(90)).toBe(9000);
      expect(toCents(90.0)).toBe(9000);
      expect(toCents('90.00')).toBe(9000);
      expect(toCents('0.01')).toBe(1);
    });

    it('does not drift on classic floating-point hazards', () => {
      // 0.1 + 0.2 → 0.30000000000000004 in float; we want exact 30.
      expect(toCents('0.10') + toCents('0.20')).toBe(30);
    });

    it('formats integer cents as $X.XX', () => {
      expect(formatCents(0)).toBe('$0.00');
      expect(formatCents(1)).toBe('$0.01');
      expect(formatCents(9000)).toBe('$90.00');
      expect(formatCents(423000)).toBe('$4230.00');
    });
  });

  describe('flat-rate generation', () => {
    it('47 cases × $90.00 = exactly $4230.00 (cent math, no float drift)', () => {
      const r = computeInvoiceLines({
        pricingMode: 'flat',
        flatRate: 90.0,
        rates: [],
        breakdown: {},
        caseCount: 47,
      });
      expect(r.total_cents).toBe(423000);
      expect(r.total_display).toBe('$4230.00');
      expect(r.lineItems).toHaveLength(1);
      expect(r.lineItems[0].count).toBe(47);
      expect(r.lineItems[0].subtotal_cents).toBe(423000);
    });

    it('itemised flat with per-provider breakdown sums correctly', () => {
      const r = computeInvoiceLines({
        pricingMode: 'flat',
        flatRate: 90.0,
        rates: [],
        breakdown: {
          byProvider: [
            { providerName: 'Dr A', count: 10 },
            { providerName: 'Dr B', count: 7 },
          ],
        },
        itemized: true,
      });
      expect(r.lineItems).toHaveLength(2);
      expect(r.total_cents).toBe(90 * 100 * 17);
      expect(r.total_display).toBe('$1530.00');
    });
  });

  describe('per-specialty generation', () => {
    it('Family $80×10 + Pediatrics $100×5 + Behavioral $120×2 = exactly $1540.00', () => {
      const r = computeInvoiceLines({
        pricingMode: 'per_specialty',
        flatRate: 0,
        rates: [
          { specialty: 'Family Medicine', rateAmount: 80 },
          { specialty: 'Pediatrics', rateAmount: 100 },
          { specialty: 'Behavioral', rateAmount: 120 },
        ],
        breakdown: {
          bySpecialty: {
            'Family Medicine': 10,
            Pediatrics: 5,
            Behavioral: 2,
          },
        },
      });
      // 80*10 + 100*5 + 120*2 = 800 + 500 + 240 = 1540
      expect(r.total_cents).toBe(154000);
      expect(r.total_display).toBe('$1540.00');
      expect(r.lineItems).toHaveLength(3);
      // sorted alphabetically by specialty name
      expect(r.lineItems.map((l) => l.specialty)).toEqual([
        'Behavioral',
        'Family Medicine',
        'Pediatrics',
      ]);
    });

    it('uses default fallback rate for specialties without explicit row (SA-111)', () => {
      const r = computeInvoiceLines({
        pricingMode: 'per_specialty',
        flatRate: 0,
        rates: [
          { specialty: 'Family Medicine', rateAmount: 80 },
          { specialty: 'Default', rateAmount: 50, isDefault: true },
        ],
        breakdown: {
          bySpecialty: {
            'Family Medicine': 10, // explicit → 80
            'Cardiology': 4,        // no explicit → fallback 50
          },
        },
      });
      // 80*10 + 50*4 = 800 + 200 = 1000
      expect(r.total_cents).toBe(100000);
      expect(r.total_display).toBe('$1000.00');
      const family = r.lineItems.find((l) => l.specialty === 'Family Medicine')!;
      const cardio = r.lineItems.find((l) => l.specialty === 'Cardiology')!;
      expect(family.rate).toBe(80);
      expect(cardio.rate).toBe(50);
    });

    it('itemised per-specialty produces per-provider lines (different shape than non-itemised)', () => {
      const nonItemised = computeInvoiceLines({
        pricingMode: 'per_specialty',
        flatRate: 0,
        rates: [{ specialty: 'Family Medicine', rateAmount: 80, isDefault: true }],
        breakdown: { bySpecialty: { 'Family Medicine': 5 } },
      });
      const itemised = computeInvoiceLines({
        pricingMode: 'per_specialty',
        flatRate: 0,
        rates: [{ specialty: 'Family Medicine', rateAmount: 80, isDefault: true }],
        breakdown: {
          byProvider: [
            { providerName: 'Dr A', specialty: 'Family Medicine', count: 3 },
            { providerName: 'Dr B', specialty: 'Family Medicine', count: 2 },
          ],
        },
        itemized: true,
      });
      // Both totals should match (5 × 80 = 400).
      expect(nonItemised.total_cents).toBe(40000);
      expect(itemised.total_cents).toBe(40000);
      // But shape differs: non-itemised has 1 line (specialty only), itemised has 2 (with provider names).
      expect(nonItemised.lineItems).toHaveLength(1);
      expect(nonItemised.lineItems[0].provider_name).toBeUndefined();
      expect(itemised.lineItems).toHaveLength(2);
      expect(itemised.lineItems[0].provider_name).toBe('Dr A');
      expect(itemised.lineItems[1].provider_name).toBe('Dr B');
    });
  });

  it('handles fractional rates exactly ($90.10 × 47 = $4234.70)', () => {
    // 9010 cents × 47 = 423470 cents = $4234.70 — proves no float drift on
    // classic hazardous values like 90.10.
    const r = computeInvoiceLines({
      pricingMode: 'flat',
      flatRate: 90.1,
      rates: [],
      breakdown: {},
      caseCount: 47,
    });
    expect(r.total_cents).toBe(423470);
    expect(r.total_display).toBe('$4234.70');
  });
});
