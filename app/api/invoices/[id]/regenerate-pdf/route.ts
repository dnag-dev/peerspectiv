import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { invoices } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { put } from '@vercel/blob';
import { renderPdfToBuffer } from '@/lib/pdf/render';
import { InvoicePdf } from '@/lib/pdf/templates/InvoicePdf';
import { fetchInvoicePdfDataFromInvoice } from '@/lib/reports/data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/invoices/[id]/regenerate-pdf
 *
 * Re-renders the invoice PDF and pushes to Vercel Blob, updating
 * invoices.pdf_url. Used when the original create call couldn't write to
 * blob (missing BLOB_READ_WRITE_TOKEN in dev) and admin wants to retry
 * after env config is fixed.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        {
          error:
            'BLOB_READ_WRITE_TOKEN is not configured. Set this in Vercel env vars (production) before regenerating.',
          code: 'BLOB_TOKEN_MISSING',
        },
        { status: 503 }
      );
    }

    const [row] = await db
      .select({ id: invoices.id, invoiceNumber: invoices.invoiceNumber })
      .from(invoices)
      .where(eq(invoices.id, id))
      .limit(1);
    if (!row) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const pdfData = await fetchInvoicePdfDataFromInvoice(id);
    if (!pdfData) {
      return NextResponse.json(
        { error: 'Invoice data could not be loaded' },
        { status: 500 }
      );
    }

    const pdfBuffer = await renderPdfToBuffer(
      InvoicePdf({ data: pdfData }) as any
    );
    const blob = await put(
      `invoices/${row.id}-${row.invoiceNumber}.pdf`,
      pdfBuffer,
      { access: 'public', contentType: 'application/pdf' }
    );

    await db
      .update(invoices)
      .set({ pdfUrl: blob.url })
      .where(eq(invoices.id, id));

    return NextResponse.json({ ok: true, pdfUrl: blob.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[invoices.regenerate-pdf]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
