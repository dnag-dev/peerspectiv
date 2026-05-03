import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { invoices, companies } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { aautipay } from '@/lib/aautipay/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const [inv] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, params.id))
      .limit(1);
    if (!inv) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, inv.companyId))
      .limit(1);
    if (!company) return NextResponse.json({ error: 'Company missing' }, { status: 400 });

    // Lazy-create payment link on first send
    let paymentLinkUrl = inv.paymentLinkUrl;
    if (!paymentLinkUrl && process.env.AAUTIPAY_EMAIL) {
      try {
        const link = await aautipay.createPaymentLink({
          name: company.contactPerson ?? company.name,
          amount: Number(inv.totalAmount),
          mobile: company.contactPhone ?? '',
          email: company.contactEmail ?? '',
          country_code: 'US',
          currency: inv.currency ?? 'USD',
          transaction_code: inv.invoiceNumber,
          order_details: {
            invoice_id: inv.id,
            company_id: inv.companyId,
          },
        });
        paymentLinkUrl = link?.payment_link ?? null;
      } catch (e) {
        console.error('[invoices.send] Aautipay link failed:', e);
      }
    }

    const [updated] = await db
      .update(invoices)
      .set({
        status: 'sent',
        sentAt: new Date(),
        paymentLinkUrl: paymentLinkUrl ?? inv.paymentLinkUrl,
        paymentProvider: paymentLinkUrl ? 'aautipay' : inv.paymentProvider,
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, params.id))
      .returning();

    // Phase 7 (CL-030): notify the client per company.deliveryMethod.
    //   'portal'        → no email (in-app surface only).
    //   'secure_email'  → email the billing contact.
    //   'both'          → email + portal.
    try {
      const deliveryMethod = (company as any).deliveryMethod ?? 'portal';
      if ((deliveryMethod === 'secure_email' || deliveryMethod === 'both') && company.contactEmail) {
        const { sendEmail } = await import('@/lib/email/notifications');
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.peerspectiv.ai';
        const portalUrl = `${appUrl}/portal/invoices`;
        const subject = `New invoice ${updated.invoiceNumber} — ${company.name}`;
        const html = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color:#0F2044;">Invoice ${updated.invoiceNumber}</h2>
            <p>Hi ${company.contactPerson ?? company.name},</p>
            <p>A new invoice for $${Number(updated.totalAmount).toFixed(2)} (${updated.reviewCount} reviews) is available for the period <strong>${updated.rangeStart} → ${updated.rangeEnd}</strong>.</p>
            <p>Due date: <strong>${updated.dueDate ?? '—'}</strong></p>
            ${updated.pdfUrl ? `<p><a href="${updated.pdfUrl}">Download PDF</a></p>` : ''}
            ${paymentLinkUrl ? `<p><a href="${paymentLinkUrl}" style="background:#1E4DB7;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:16px;">Pay now</a></p>` : ''}
            <p style="margin-top:24px;">View all invoices in your <a href="${portalUrl}">portal</a>.</p>
          </div>
        `;
        await sendEmail({ to: company.contactEmail, subject, html });
      }
    } catch (e) {
      console.error('[invoices.send] email notification failed (non-fatal):', e);
    }

    return NextResponse.json({ invoice: updated });
  } catch (err) {
    console.error('[invoices.send] failed:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    );
  }
}
