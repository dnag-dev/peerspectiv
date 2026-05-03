/**
 * Phase 7 invoice generator.
 *
 * Computes invoice totals from a per-specialty case breakdown OR a flat
 * cases × rate calculation. ALL math is performed in INTEGER CENTS to avoid
 * floating-point drift (SA-114). The function returns structured line items
 * plus a PDF buffer (rendered via the existing InvoicePdf template) so it
 * can be persisted, emailed, and downloaded.
 *
 * Pricing resolution:
 *   - company.pricing_mode === 'flat'  → 1 line × caseCount × company.per_review_rate
 *   - company.pricing_mode === 'per_specialty'
 *       → 1 line per (specialty, count) using company_specialty_rates
 *       → specialties with no explicit row fall back to the row marked
 *         is_default = true (SA-111)
 *       → if no default row exists either, fall back to company.per_review_rate,
 *         then global_settings.global_pay_rate_per_review
 *
 * The generator is *pure-by-input*: callers can pass in the case breakdown
 * (e.g. queried from review_results) so it stays unit-testable.
 */

import { db } from '@/lib/db';
import {
  companies,
  companySpecialtyRates,
  globalSettings,
} from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
// PDF imports are dynamic (deferred) so the pure math export
// (computeInvoiceLines) stays loadable in non-DOM test environments where
// React-PDF / TSX template parsing would otherwise fail. We re-declare the
// minimal line-item shape locally instead of importing the template type.
interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface InvoiceCaseBreakdown {
  /** Map of specialty → case count. Use a single key like "Flat" for flat-rate. */
  bySpecialty?: Record<string, number>;
  /** For flat-rate convenience or per-provider itemization. */
  byProvider?: Array<{ providerName: string; specialty?: string; count: number }>;
}

export interface InvoiceParams {
  companyId: string;
  cadencePeriodLabel: string;
  /** Optional manual override of total case count (SA-080). */
  caseCount?: number;
  /** Whether to itemize per-provider lines (SA-081). */
  itemized?: boolean;
  /** Pre-aggregated breakdown (caller supplies); generator does NOT query review_results. */
  breakdown?: InvoiceCaseBreakdown;
  /** Optional override for per-specialty rates (testing). */
  ratesOverride?: Array<{ specialty: string; rateAmount: number; isDefault?: boolean }>;
  /** Optional override for company shape (testing). */
  companyOverride?: {
    name: string;
    pricingMode: 'flat' | 'per_specialty';
    perReviewRate?: number | null;
    contactEmail?: string | null;
    contactPerson?: string | null;
    address?: string | null;
  };
  /** Optional fallback rate used when no other rate is resolvable (testing). */
  globalFallbackRate?: number;
}

export interface InvoiceLine {
  specialty?: string;
  provider_name?: string;
  count: number;
  /** Rate in dollars (decimal). */
  rate: number;
  /** Line subtotal in INTEGER CENTS. */
  subtotal_cents: number;
}

export interface GenerateInvoiceResult {
  pdfBuffer: Buffer;
  lineItems: InvoiceLine[];
  total_cents: number;
  /** Convenience: dollar formatted total (e.g. "$4230.00"). */
  total_display: string;
}

/* ─── helpers ─────────────────────────────────────────────────────────── */

/** Convert dollar value (number or numeric string) to integer cents. */
export function toCents(dollars: number | string): number {
  // Use string parsing to avoid floating-point error on values like 90.10.
  const s = String(dollars).trim();
  if (!s || !/^-?\d+(\.\d+)?$/.test(s)) {
    const n = Number(s);
    if (!Number.isFinite(n)) return 0;
    return Math.round(n * 100);
  }
  const neg = s.startsWith('-');
  const body = neg ? s.slice(1) : s;
  const [whole, frac = ''] = body.split('.');
  const fracPadded = (frac + '00').slice(0, 2); // truncate to 2 dp
  const cents = Number(whole) * 100 + Number(fracPadded || '0');
  return neg ? -cents : cents;
}

/** Format integer cents as a dollar string (no currency symbol other than $). */
export function formatCents(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  const dollars = Math.trunc(abs / 100);
  const rest = abs % 100;
  return `${sign}$${dollars}.${String(rest).padStart(2, '0')}`;
}

/* ─── core ────────────────────────────────────────────────────────────── */

interface ResolvedCompany {
  id: string;
  name: string;
  pricingMode: 'flat' | 'per_specialty';
  perReviewRate: number | null;
  contactEmail: string | null;
  contactPerson: string | null;
  address: string | null;
}

async function resolveCompany(companyId: string, override?: InvoiceParams['companyOverride']): Promise<ResolvedCompany> {
  if (override) {
    return {
      id: companyId,
      name: override.name,
      pricingMode: override.pricingMode,
      perReviewRate: override.perReviewRate ?? null,
      contactEmail: override.contactEmail ?? null,
      contactPerson: override.contactPerson ?? null,
      address: override.address ?? null,
    };
  }
  const [c] = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
  if (!c) throw new Error(`Company ${companyId} not found`);
  return {
    id: c.id,
    name: c.name,
    pricingMode: ((c as any).pricingMode ?? 'flat') as 'flat' | 'per_specialty',
    perReviewRate: c.perReviewRate ? Number(c.perReviewRate) : null,
    contactEmail: c.contactEmail ?? null,
    contactPerson: c.contactPerson ?? null,
    address: c.address ?? null,
  };
}

async function resolveRates(companyId: string, override?: InvoiceParams['ratesOverride']) {
  if (override) {
    return override.map((r) => ({
      specialty: r.specialty,
      rateAmount: r.rateAmount,
      isDefault: !!r.isDefault,
    }));
  }
  const rows = await db
    .select()
    .from(companySpecialtyRates)
    .where(eq(companySpecialtyRates.companyId, companyId));
  return rows.map((r) => ({
    specialty: r.specialty,
    rateAmount: Number(r.rateAmount),
    isDefault: !!r.isDefault,
  }));
}

async function resolveGlobalFallback(override?: number): Promise<number> {
  if (override !== undefined) return override;
  try {
    const [row] = await db
      .select()
      .from(globalSettings)
      .where(eq(globalSettings.settingKey, 'global_pay_rate_per_review'))
      .limit(1);
    if (row?.settingValue !== undefined && row?.settingValue !== null) {
      const n = Number(row.settingValue as any);
      if (Number.isFinite(n)) return n;
    }
  } catch {
    /* db unavailable in tests */
  }
  return 0;
}

/**
 * Pure math helper — testable without DB or PDF rendering. Computes the
 * line-item array and total_cents given fully-resolved inputs.
 */
export function computeInvoiceLines(input: {
  pricingMode: 'flat' | 'per_specialty';
  flatRate: number; // dollars; used when mode=flat or as last fallback
  rates: Array<{ specialty: string; rateAmount: number; isDefault?: boolean }>;
  breakdown: InvoiceCaseBreakdown;
  caseCount?: number;
  itemized?: boolean;
}): { lineItems: InvoiceLine[]; total_cents: number; total_display: string } {
  const { pricingMode, flatRate, rates, breakdown, caseCount, itemized } = input;
  const lineItems: InvoiceLine[] = [];

  if (pricingMode === 'flat') {
    const totalCases =
      caseCount ??
      sum(Object.values(breakdown.bySpecialty ?? {})) ??
      sum((breakdown.byProvider ?? []).map((p) => p.count));
    const rate = flatRate;
    const rateCents = toCents(rate);

    if (itemized && breakdown.byProvider && breakdown.byProvider.length > 0) {
      for (const p of breakdown.byProvider) {
        lineItems.push({
          provider_name: p.providerName,
          specialty: p.specialty,
          count: p.count,
          rate,
          subtotal_cents: rateCents * p.count,
        });
      }
    } else {
      lineItems.push({
        count: totalCases,
        rate,
        subtotal_cents: rateCents * totalCases,
      });
    }
  } else {
    const defaultRow = rates.find((r) => r.isDefault);
    const defaultRate = defaultRow?.rateAmount ?? flatRate;

    if (itemized && breakdown.byProvider && breakdown.byProvider.length > 0) {
      for (const p of breakdown.byProvider) {
        const explicit = p.specialty
          ? rates.find((r) => r.specialty === p.specialty)
          : undefined;
        const rate = explicit?.rateAmount ?? defaultRate;
        const rateCents = toCents(rate);
        lineItems.push({
          provider_name: p.providerName,
          specialty: p.specialty,
          count: p.count,
          rate,
          subtotal_cents: rateCents * p.count,
        });
      }
    } else {
      const bySpec = breakdown.bySpecialty ?? {};
      const sortedKeys = Object.keys(bySpec).sort();
      for (const specialty of sortedKeys) {
        const count = bySpec[specialty];
        if (!count) continue;
        const explicit = rates.find((r) => r.specialty === specialty);
        const rate = explicit?.rateAmount ?? defaultRate;
        const rateCents = toCents(rate);
        lineItems.push({
          specialty,
          count,
          rate,
          subtotal_cents: rateCents * count,
        });
      }
    }

    if (lineItems.length === 0 && caseCount !== undefined) {
      const rateCents = toCents(defaultRate);
      lineItems.push({
        count: caseCount,
        rate: defaultRate,
        subtotal_cents: rateCents * caseCount,
      });
    }
  }

  const total_cents = lineItems.reduce((s, l) => s + l.subtotal_cents, 0);
  return { lineItems, total_cents, total_display: formatCents(total_cents) };
}

export async function generateInvoice(params: InvoiceParams): Promise<GenerateInvoiceResult> {
  const company = await resolveCompany(params.companyId, params.companyOverride);
  const rates = await resolveRates(params.companyId, params.ratesOverride);
  const globalFallback = await resolveGlobalFallback(params.globalFallbackRate);

  const breakdown = params.breakdown ?? {};
  const itemized = !!params.itemized;

  const flatRate = company.perReviewRate ?? globalFallback;
  const computed = computeInvoiceLines({
    pricingMode: company.pricingMode,
    flatRate,
    rates,
    breakdown,
    caseCount: params.caseCount,
    itemized,
  });
  const { lineItems, total_cents, total_display } = computed;

  // Build the React-PDF data shape (uses dollar values; we feed exact cents-derived numbers).
  const pdfLineItems: InvoiceLineItem[] = lineItems.map((l) => ({
    description: l.specialty
      ? `${l.specialty}${l.provider_name ? ` — ${l.provider_name}` : ''} (${l.count} review${l.count === 1 ? '' : 's'})`
      : l.provider_name
        ? `${l.provider_name} (${l.count} review${l.count === 1 ? '' : 's'})`
        : `Peer reviews completed (${l.count})`,
    quantity: l.count,
    unitPrice: l.rate,
    lineTotal: l.subtotal_cents / 100,
  }));

  const issuerName = await getGlobalString('peerspectiv_company_name', 'Peerspectiv LLC');
  const issuerAddress = await getGlobalString('peerspectiv_address', '');
  const issuerEmail = await getGlobalString('peerspectiv_email', 'billing@peerspectiv.com');

  const pdfData = {
    invoiceNumber: 'PREVIEW',
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: null,
    rangeStart: params.cadencePeriodLabel,
    rangeEnd: params.cadencePeriodLabel,
    issuer: { companyName: issuerName, address: issuerAddress, email: issuerEmail },
    billTo: {
      companyName: company.name,
      contactPerson: company.contactPerson,
      contactEmail: company.contactEmail,
      address: company.address,
    },
    reviewCount: lineItems.reduce((s, l) => s + l.count, 0),
    providerCount: itemized ? (breakdown.byProvider?.length ?? 0) : 0,
    unitPrice: lineItems[0]?.rate ?? 0,
    lineItems: pdfLineItems,
    subtotal: total_cents / 100,
    taxAmount: 0,
    totalAmount: total_cents / 100,
    currency: 'USD',
    paymentLinkUrl: null,
    notes: `Cadence period: ${params.cadencePeriodLabel}`,
    quantityOverride: params.caseCount ?? null,
    adjustmentReason: null,
    itemizedLines: itemized
      ? lineItems
          .filter((l) => l.provider_name)
          .map((l) => ({
            provider_name: l.provider_name!,
            count: l.count,
            rate: l.rate,
            total: l.subtotal_cents / 100,
          }))
      : null,
  };

  const { renderPdfToBuffer } = await import('@/lib/pdf/render');
  const { InvoicePdf } = await import('@/lib/pdf/templates/InvoicePdf');
  const pdfBuffer = await renderPdfToBuffer(InvoicePdf({ data: pdfData }) as any);

  return { pdfBuffer, lineItems, total_cents, total_display };
}

function sum(arr: number[] | undefined): number {
  if (!arr) return 0;
  return arr.reduce((s, n) => s + (Number.isFinite(n) ? n : 0), 0);
}

async function getGlobalString(key: string, fallback: string): Promise<string> {
  try {
    const [row] = await db
      .select()
      .from(globalSettings)
      .where(eq(globalSettings.settingKey, key))
      .limit(1);
    if (typeof row?.settingValue === 'string') return row.settingValue || fallback;
  } catch { /* ignore */ }
  return fallback;
}
