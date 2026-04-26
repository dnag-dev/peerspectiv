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

    // Email integration is out of scope; this endpoint just flips the
    // state and returns the link the admin can copy/paste manually.
    return NextResponse.json({ invoice: updated });
  } catch (err) {
    console.error('[invoices.send] failed:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    );
  }
}
