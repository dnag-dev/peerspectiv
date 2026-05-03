import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { reviewCases, reviewResults, providers, invoices, companies, globalSettings } from '@/lib/db/schema';
import { sql, eq, desc } from 'drizzle-orm';
import { put } from '@vercel/blob';
import { generateInvoice, type InvoiceCaseBreakdown } from '@/lib/invoices/generate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function requireAdmin(req: NextRequest): Promise<string | null> {
  try {
    const { auth } = await import('@clerk/nextjs/server');
    const userId = (auth() as any)?.userId;
    if (userId) return userId as string;
  } catch {
    /* clerk not configured */
  }
  const demo = req.headers.get('x-demo-user-id') || req.cookies.get('demo_user')?.value;
  return demo?.trim() || null;
}

async function nextInvoiceNumber(): Promise<string> {
  const result = (await db.execute(
    sql`SELECT nextval('invoice_number_seq')::int AS n`
  )) as any;
  const n = Number((result.rows ?? result)[0].n);
  const year = new Date().getFullYear();
  return `INV-${year}-${String(n).padStart(6, '0')}`;
}

/**
 * POST /api/invoices/generate
 * body: {
 *   company_id: string,
 *   cadence_period_label: string,   // e.g. "2026-Q1" or "2026-04"
 *   case_count?: number,            // optional manual override (SA-080)
 *   adjustment_reason?: string,     // required when case_count is set
 *   itemized?: boolean,             // overrides company default
 *   persist?: boolean,              // default true; false = preview only
 * }
 *
 * Resolves the breakdown by querying review_results for cases stamped with
 * cadence_period_label, computes line items via lib/invoices/generate, renders
 * the PDF, and inserts an invoices row in draft state.
 */
export async function POST(req: NextRequest) {
  try {
    const userId = (await requireAdmin(req)) ?? 'admin';
    const body = await req.json();
    const companyId: string = body.company_id;
    const cadencePeriodLabel: string = body.cadence_period_label;
    const caseCountOverride: number | undefined = body.case_count !== undefined && body.case_count !== null && body.case_count !== ''
      ? Math.trunc(Number(body.case_count)) : undefined;
    const adjustmentReason: string | null = typeof body.adjustment_reason === 'string' && body.adjustment_reason.trim()
      ? body.adjustment_reason.trim() : null;
    const persist: boolean = body.persist !== false; // default true

    if (!companyId || !cadencePeriodLabel) {
      return NextResponse.json({ error: 'company_id and cadence_period_label are required' }, { status: 400 });
    }
    if (caseCountOverride !== undefined && (!Number.isFinite(caseCountOverride) || caseCountOverride < 0)) {
      return NextResponse.json({ error: 'case_count must be a non-negative integer' }, { status: 400 });
    }
    if (caseCountOverride !== undefined && !adjustmentReason) {
      return NextResponse.json({ error: 'adjustment_reason is required when case_count is set' }, { status: 400 });
    }

    const [company] = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
    if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 });

    // Itemised flag — request body wins; otherwise company default.
    const itemized: boolean = typeof body.itemized === 'boolean' ? body.itemized : !!company.itemizeInvoice;

    // Build the breakdown from review_results joined with cases for this cadence period.
    const breakdownRows = (await db.execute(sql`
      SELECT rc.specialty AS specialty,
             p.id AS provider_id,
             COALESCE(p.first_name, '') AS first_name,
             COALESCE(p.last_name, '') AS last_name,
             pr.specialty AS provider_specialty,
             COUNT(rr.id)::int AS cnt
      FROM review_results rr
      INNER JOIN review_cases rc ON rc.id = rr.case_id
      LEFT JOIN providers p ON p.id = rc.provider_id
      LEFT JOIN providers pr ON pr.id = rc.provider_id
      WHERE rc.company_id = ${companyId}
        AND rc.cadence_period_label = ${cadencePeriodLabel}
      GROUP BY rc.specialty, p.id, p.first_name, p.last_name, pr.specialty
      ORDER BY pr.specialty, p.last_name, p.first_name
    `)).rows as Array<{
      specialty: string | null;
      provider_id: string | null;
      first_name: string;
      last_name: string;
      provider_specialty: string | null;
      cnt: number;
    }>;

    // Resolve specialty per row: case-level specialty first, then provider's.
    const bySpecialty: Record<string, number> = {};
    const byProvider: Array<{ providerName: string; specialty?: string; count: number }> = [];
    for (const r of breakdownRows) {
      const spec = (r.specialty ?? r.provider_specialty ?? 'Unspecified').trim() || 'Unspecified';
      bySpecialty[spec] = (bySpecialty[spec] ?? 0) + Number(r.cnt);
      byProvider.push({
        providerName: `${r.first_name} ${r.last_name}`.trim() || 'Unassigned provider',
        specialty: spec,
        count: Number(r.cnt),
      });
    }

    const breakdown: InvoiceCaseBreakdown = { bySpecialty, byProvider };
    const result = await generateInvoice({
      companyId,
      cadencePeriodLabel,
      caseCount: caseCountOverride,
      itemized,
      breakdown,
    });

    if (!persist) {
      return NextResponse.json({
        preview: {
          line_items: result.lineItems,
          total_cents: result.total_cents,
          total_display: result.total_display,
        },
      });
    }

    // Persist + push PDF to blob.
    const invoiceNumber = await nextInvoiceNumber();
    const totalDollars = result.total_cents / 100;
    const totalCases = caseCountOverride ?? Object.values(bySpecialty).reduce((s, n) => s + n, 0);
    const dueDays = await (async () => {
      try {
        const [s] = await db.select().from(globalSettings).where(eq(globalSettings.settingKey, 'default_invoice_due_days')).limit(1);
        return Number(s?.settingValue ?? 30) || 30;
      } catch { return 30; }
    })();
    const dueDate = new Date(Date.now() + dueDays * 86400_000).toISOString().slice(0, 10);

    let pdfUrl: string | null = null;
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const blob = await put(`invoices/${invoiceNumber}.pdf`, result.pdfBuffer, {
          access: 'public',
          contentType: 'application/pdf',
        });
        pdfUrl = blob.url;
      } catch (e) {
        console.error('[invoices.generate] blob put failed:', e);
      }
    }

    const unitPriceDollars = result.lineItems[0]?.rate ?? 0;
    const [created] = await db
      .insert(invoices)
      .values({
        invoiceNumber,
        companyId,
        rangeStart: cadencePeriodLabel,
        rangeEnd: cadencePeriodLabel,
        unitPrice: String(unitPriceDollars.toFixed(2)),
        reviewCount: totalCases,
        providerCount: byProvider.length,
        subtotal: String(totalDollars.toFixed(2)),
        taxAmount: '0.00',
        totalAmount: String(totalDollars.toFixed(2)),
        currency: 'USD',
        status: 'draft',
        description: `Peer review services · ${cadencePeriodLabel}`,
        lineItems: result.lineItems as any,
        dueDate,
        createdBy: userId,
        quantityOverride: caseCountOverride ?? undefined,
        adjustmentReason: adjustmentReason ?? undefined,
        itemizedLines: itemized
          ? (result.lineItems
              .filter((l) => l.provider_name)
              .map((l) => ({
                provider_name: l.provider_name!,
                count: l.count,
                rate: l.rate,
                total: l.subtotal_cents / 100,
              })) as any)
          : undefined,
        pdfUrl: pdfUrl ?? undefined,
      })
      .returning();

    return NextResponse.json({
      invoice: created,
      total_cents: result.total_cents,
      total_display: result.total_display,
      line_items: result.lineItems,
    });
  } catch (err) {
    console.error('[invoices.generate] failed:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    );
  }
}
