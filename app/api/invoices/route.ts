import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { invoices, companies, reviewCases, reviewResults, globalSettings } from '@/lib/db/schema';
import { and, between, eq, sql, desc } from 'drizzle-orm';
import { put } from '@vercel/blob';
import { renderPdfToBuffer } from '@/lib/pdf/render';
import { InvoicePdf } from '@/lib/pdf/templates/InvoicePdf';
import { fetchInvoicePdfDataFromInvoice } from '@/lib/reports/data';
import { aautipay } from '@/lib/aautipay/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function getAdminUserId(req: NextRequest): Promise<string | null> {
  try {
    const { auth } = await import('@clerk/nextjs/server');
    const result = auth();
    const userId = (result as any)?.userId;
    if (userId) return userId as string;
  } catch {
    /* clerk not configured */
  }
  const demo = req.headers.get('x-demo-user-id');
  if (demo && demo.trim()) return demo.trim();
  const cookieRaw = req.cookies.get('demo_user')?.value;
  if (cookieRaw) {
    try {
      const parsed = JSON.parse(cookieRaw);
      if (parsed?.email) return `demo:${parsed.email}`;
    } catch { /* malformed cookie */ }
  }
  return null;
}

async function getSetting(key: string): Promise<any> {
  const [row] = await db
    .select()
    .from(globalSettings)
    .where(eq(globalSettings.settingKey, key))
    .limit(1);
  return row?.settingValue;
}

async function nextInvoiceNumber(): Promise<string> {
  // Atomic, monotonic sequence (see migration 008).
  const result = (await db.execute(
    sql`SELECT nextval('invoice_number_seq')::int AS n`
  )) as any;
  const n = Number((result.rows ?? result)[0].n);
  const year = new Date().getFullYear();
  return `INV-${year}-${String(n).padStart(6, '0')}`;
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const companyId = url.searchParams.get('companyId');
    const status = url.searchParams.get('status');
    const conditions = [] as any[];
    if (companyId) conditions.push(eq(invoices.companyId, companyId));
    if (status) conditions.push(eq(invoices.status, status));
    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const rows = where
      ? await db.select().from(invoices).where(where).orderBy(desc(invoices.createdAt))
      : await db.select().from(invoices).orderBy(desc(invoices.createdAt)).limit(200);
    return NextResponse.json({ invoices: rows });
  } catch (err) {
    console.error('[invoices] GET failed:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = (await getAdminUserId(req)) ?? 'admin';
    const body = await req.json();
    const {
      companyId,
      rangeStart,
      rangeEnd,
      unitPrice: overrideUnitPrice,
      taxAmount,
      notes,
      dueDate: overrideDueDate,
      createPaymentLink: shouldCreatePaymentLink,
      quantityOverride: rawQuantityOverride,
      adjustmentReason: rawAdjustmentReason,
    } = body as Record<string, any>;

    const quantityOverride =
      rawQuantityOverride === undefined ||
      rawQuantityOverride === null ||
      rawQuantityOverride === ''
        ? null
        : Number.isFinite(Number(rawQuantityOverride))
          ? Math.trunc(Number(rawQuantityOverride))
          : null;
    const adjustmentReason =
      typeof rawAdjustmentReason === 'string' && rawAdjustmentReason.trim()
        ? rawAdjustmentReason.trim()
        : null;
    if (quantityOverride !== null && !adjustmentReason) {
      return NextResponse.json(
        { error: 'adjustmentReason is required when quantityOverride is set' },
        { status: 400 }
      );
    }

    if (!companyId || !rangeStart || !rangeEnd) {
      return NextResponse.json(
        { error: 'companyId, rangeStart, rangeEnd required' },
        { status: 400 }
      );
    }

    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Auto-compute review + provider counts from submitted reviews in range
    const [counts] = (await db.execute(sql`
      SELECT
        COUNT(rr.id)::int AS review_count,
        COUNT(DISTINCT rc.provider_id)::int AS provider_count
      FROM review_results rr
      INNER JOIN review_cases rc ON rc.id = rr.case_id
      WHERE rc.company_id = ${companyId}
        AND rr.submitted_at >= ${rangeStart}::date
        AND rr.submitted_at < (${rangeEnd}::date + INTERVAL '1 day')
    `)).rows as any;
    const reviewCount = Number(counts?.review_count ?? 0);
    const providerCount = Number(counts?.provider_count ?? 0);

    // Resolve unit price: explicit override → company.perReviewRate → global default
    const globalRate = Number((await getSetting('global_pay_rate_per_review')) ?? 35);
    const unitPrice = Number(
      overrideUnitPrice ?? company.perReviewRate ?? globalRate
    );

    const billedQuantity = quantityOverride ?? reviewCount;
    const subtotal = +(unitPrice * billedQuantity).toFixed(2);
    const tax = Number(taxAmount ?? 0);
    const total = +(subtotal + tax).toFixed(2);

    const dueDays = Number((await getSetting('default_invoice_due_days')) ?? 30);
    const dueDate =
      overrideDueDate ??
      new Date(Date.now() + dueDays * 86400_000).toISOString().slice(0, 10);

    const invoiceNumber = await nextInvoiceNumber();
    const description = `Peer review services · ${rangeStart} — ${rangeEnd}`;
    const lineItems = [
      {
        description: `Peer reviews completed (${rangeStart} — ${rangeEnd})`,
        quantity: billedQuantity,
        unitPrice,
        lineTotal: subtotal,
      },
    ];

    // Compute per-provider itemized lines if company opted in
    let itemizedLines: Array<{
      provider_name: string;
      count: number;
      rate: number;
      total: number;
    }> | null = null;
    if (company.itemizeInvoice) {
      const itemRows = (await db.execute(sql`
        SELECT p.id AS provider_id,
               COALESCE(p.first_name, '') AS first_name,
               COALESCE(p.last_name, '') AS last_name,
               COUNT(rr.id)::int AS cnt
        FROM review_results rr
        INNER JOIN review_cases rc ON rc.id = rr.case_id
        LEFT JOIN providers p ON p.id = rc.provider_id
        WHERE rc.company_id = ${companyId}
          AND rr.submitted_at >= ${rangeStart}::date
          AND rr.submitted_at < (${rangeEnd}::date + INTERVAL '1 day')
        GROUP BY p.id, p.first_name, p.last_name
        ORDER BY last_name, first_name
      `)).rows as Array<{
        provider_id: string | null;
        first_name: string;
        last_name: string;
        cnt: number;
      }>;
      itemizedLines = itemRows.map((r) => {
        const name =
          `${r.first_name} ${r.last_name}`.trim() || 'Unassigned provider';
        const count = Number(r.cnt);
        return {
          provider_name: name,
          count,
          rate: unitPrice,
          total: +(unitPrice * count).toFixed(2),
        };
      });
    }

    const [created] = await db
      .insert(invoices)
      .values({
        invoiceNumber,
        companyId,
        rangeStart,
        rangeEnd,
        unitPrice: String(unitPrice),
        reviewCount,
        providerCount,
        subtotal: String(subtotal),
        taxAmount: String(tax),
        totalAmount: String(total),
        currency: 'USD',
        status: 'draft',
        description,
        lineItems,
        dueDate,
        notes: notes ?? null,
        createdBy: userId,
        quantityOverride: quantityOverride ?? undefined,
        adjustmentReason: adjustmentReason ?? undefined,
        itemizedLines: itemizedLines ?? undefined,
      })
      .returning();

    // Audit log: quantity override
    if (quantityOverride !== null) {
      try {
        const { auditLog } = await import('@/lib/utils/audit');
        await auditLog({
          userId,
          action: 'invoice_quantity_override',
          resourceType: 'invoice',
          resourceId: created.id,
          metadata: {
            original: reviewCount,
            override: quantityOverride,
            reason: adjustmentReason,
          },
          request: req,
        });
      } catch (e) {
        // Don't lose the override silently — drop a notification so an admin
        // sees it during their next session even if audit log itself broke.
        console.error('[invoices.create] audit log failed:', e);
        try {
          const { notifications } = await import('@/lib/db/schema');
          await db.insert(notifications).values({
            userId: null,
            type: 'audit_log_failure',
            title: 'Invoice override saved without audit trail',
            body: `Invoice ${created.invoiceNumber} had quantity overridden from ${reviewCount} to ${quantityOverride} (reason: ${adjustmentReason}). Audit log write failed.`,
            entityType: 'invoice',
            entityId: created.id,
          });
        } catch {
          /* last-ditch swallow */
        }
      }
    }

    // Render PDF + push to blob (always, per Phase 3 contract)
    let pdfUrl: string | null = null;
    try {
      const pdfData = await fetchInvoicePdfDataFromInvoice(created.id);
      if (pdfData) {
        const pdfBuffer = await renderPdfToBuffer(InvoicePdf({ data: pdfData }) as any);
        if (process.env.BLOB_READ_WRITE_TOKEN) {
          const blob = await put(`invoices/${created.id}-${invoiceNumber}.pdf`, pdfBuffer, {
            access: 'public',
            contentType: 'application/pdf',
          });
          pdfUrl = blob.url;
        }
      }
    } catch (e) {
      console.error('[invoices.create] PDF render failed:', e);
      // Non-fatal: invoice row exists; can re-render later
    }

    // Optionally create Aautipay payment link (best-effort)
    let paymentLinkUrl: string | null = null;
    if (shouldCreatePaymentLink && process.env.AAUTIPAY_EMAIL) {
      try {
        const link = await aautipay.createPaymentLink({
          name: company.contactPerson ?? company.name,
          amount: total,
          mobile: company.contactPhone ?? '',
          email: company.contactEmail ?? '',
          country_code: 'US',
          currency: 'USD',
          transaction_code: invoiceNumber,
          order_details: {
            invoice_id: created.id,
            company_id: companyId,
            review_count: reviewCount,
          },
        });
        paymentLinkUrl = link?.payment_link ?? null;
      } catch (e) {
        console.error('[invoices.create] Aautipay payment link failed:', e);
        // Non-fatal: invoice still usable, just no hosted link
      }
    }

    if (pdfUrl || paymentLinkUrl) {
      await db
        .update(invoices)
        .set({
          pdfUrl: pdfUrl ?? undefined,
          paymentLinkUrl: paymentLinkUrl ?? undefined,
          paymentProvider: paymentLinkUrl ? 'aautipay' : undefined,
        })
        .where(eq(invoices.id, created.id));
    }

    return NextResponse.json({
      invoice: { ...created, pdfUrl, paymentLinkUrl },
    });
  } catch (err) {
    console.error('[invoices] POST failed:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    );
  }
}
