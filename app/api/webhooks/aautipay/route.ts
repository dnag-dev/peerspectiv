import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  aautipayEvents,
  invoices,
  peerPayouts,
  peers,
  auditLogs,
} from '@/lib/db/schema';
import { aautipay, type AautipayWebhookPayload } from '@/lib/aautipay/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Aautipay webhook receiver.
 *
 * Always logs the raw event to `aautipay_events` first, then dispatches by
 * event type. We always return 200 (even on processing errors) to avoid
 * Aautipay retrying — the failure is recorded on the event row.
 *
 * NOTE: Aautipay docs (as of 2026-04-26) do not document an HMAC signing
 * scheme. Add signature verification here once Aautipay confirms the spec.
 */
export async function POST(req: NextRequest) {
  let payload: AautipayWebhookPayload;
  try {
    payload = (await req.json()) as AautipayWebhookPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!payload?.event) {
    return NextResponse.json({ error: 'Missing event' }, { status: 400 });
  }

  const externalId =
    payload.order_code ||
    payload.payout_id ||
    payload.account_id ||
    payload.beneficiary_bank_account_id ||
    payload.refund_id ||
    payload.beneficiary_id ||
    '';

  if (!externalId) {
    return NextResponse.json({ error: 'No identifying id in payload' }, { status: 400 });
  }

  const [event] = await db
    .insert(aautipayEvents)
    .values({
      eventType: payload.event,
      externalId,
      rawPayload: payload as unknown as Record<string, unknown>,
    })
    .returning();

  try {
    switch (payload.event) {
      case 'pay-in': {
        const status = await aautipay.getPayInStatus(externalId);
        const s = status.data;
        await db
          .update(invoices)
          .set({
            status:
              s.status === 'success'
                ? 'paid'
                : s.status === 'failed'
                  ? 'overdue'
                  : s.status === 'refunded'
                    ? 'refunded'
                    : 'sent',
            paidAt: s.status === 'success' ? new Date() : null,
            paymentMethod: s.payment_method ?? null,
            updatedAt: new Date(),
          })
          .where(eq(invoices.externalInvoiceId, externalId));
        break;
      }
      case 'payout': {
        const status = await aautipay.getPayoutStatus(externalId);
        const s = status.data;
        await db
          .update(peerPayouts)
          .set({
            aautipayPayoutStatus: s.status,
            externalPayoutCompletedAt: s.status === 'payout_paid' ? new Date() : null,
            externalFailReason: s.fail_reason || null,
            status:
              s.status === 'payout_paid'
                ? 'paid'
                : ['payout_cancelled', 'rejected'].includes(s.status)
                  ? 'pending'
                  : 'approved',
            paidAt: s.status === 'payout_paid' ? new Date() : null,
          })
          .where(eq(peerPayouts.aautipayPayoutId, externalId));
        break;
      }
      case 'beneficiary': {
        const status = await aautipay.getBeneficiaryStatus(externalId);
        const s = status.data;
        await db
          .update(peers)
          .set({
            aautipayBeneficiaryStatus: s.status,
            paymentReady: s.status === 'beneficiary_account_verified',
          })
          .where(eq(peers.aautipayBeneficiaryId, externalId));
        break;
      }
      case 'bank_account': {
        const data = await aautipay.getBankAccountStatus(externalId);
        const status = (data as { data?: { status?: string } }).data?.status ?? null;
        await db
          .update(peers)
          .set({
            aautipayBankStatus: status,
            paymentReady: status === 'beneficiary_bank_account_verified',
          })
          .where(eq(peers.aautipayBankAccountId, externalId));
        break;
      }
      case 'refund': {
        const status = await aautipay.getRefundStatus(externalId);
        const s = (status as { data?: { status?: string } }).data?.status ?? null;
        await db
          .update(invoices)
          .set({
            status: s === 'refunded' ? 'refunded' : 'sent',
            updatedAt: new Date(),
          })
          .where(eq(invoices.externalInvoiceId, payload.order_code ?? ''));
        break;
      }
      case 'company_representative': {
        // No direct entity mapping — log only.
        break;
      }
    }

    await db
      .update(aautipayEvents)
      .set({ processedAt: new Date() })
      .where(eq(aautipayEvents.id, event.id));

    await db.insert(auditLogs).values({
      userId: null,
      action: `aautipay_${payload.event}_processed`,
      resourceType: 'aautipay_event',
      resourceId: event.id,
      metadata: { externalId, payload: payload as unknown },
    });

    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'unknown';
    await db
      .update(aautipayEvents)
      .set({ processingError: message })
      .where(eq(aautipayEvents.id, event.id));
    console.error('[aautipay webhook] processing error', err);
    // Always 200: Aautipay should not retry once we've logged the failure.
    return NextResponse.json({ received: true, processingError: message });
  }
}
