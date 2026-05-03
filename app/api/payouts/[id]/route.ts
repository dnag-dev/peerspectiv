import { NextRequest, NextResponse } from 'next/server';
import { db, toSnake } from '@/lib/db';
import { peers, peerPayouts, aautipayEvents } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { aautipay } from '@/lib/aautipay/client';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/payouts/[id]
 *
 * Status transition. When transitioning to 'approved' AND the reviewer is
 * paymentReady, we attempt aautipay.createPayoutApproval. The internal
 * status flip ALWAYS succeeds — Aautipay failure is logged to
 * aautipay_events and stored on the payout row (externalFailReason),
 * never blocks the approval.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const { status, notes } = body as {
      status?: 'pending' | 'approved' | 'paid';
      notes?: string;
    };

    if (!status || !['pending', 'approved', 'paid'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const update: Record<string, unknown> = { status };
    if (status === 'approved') update.approvedAt = new Date();
    if (status === 'paid') update.paidAt = new Date();
    if (notes != null) update.notes = notes;

    // 1. Internal status update — happens regardless of Aautipay outcome.
    let payout;
    try {
      [payout] = await db
        .update(peerPayouts)
        .set(update)
        .where(eq(peerPayouts.id, id))
        .returning({
          id: peerPayouts.id,
          peer_id: peerPayouts.peerId,
          amount: peerPayouts.amount,
          status: peerPayouts.status,
          period_start: peerPayouts.periodStart,
          period_end: peerPayouts.periodEnd,
          aautipay_payout_id: peerPayouts.aautipayPayoutId,
        });
    } catch (err) {
      console.error('[payouts] patch error:', err);
      return NextResponse.json({ error: 'DB_ERROR' }, { status: 500 });
    }

    if (!payout) {
      return NextResponse.json({ error: 'DB_ERROR' }, { status: 500 });
    }

    // 2. Only attempt Aautipay on transition → approved, and only if we
    // haven't already created a payout for this row.
    let aautipayResult: 'skipped' | 'submitted' | 'failed' = 'skipped';
    let aautipayMessage: string | null = null;

    if (status === 'approved' && !payout.aautipay_payout_id) {
      const [peer] = await db
        .select({
          full_name: peers.fullName,
          email: peers.email,
          payment_ready: peers.paymentReady,
          aautipay_beneficiary_id: peers.aautipayBeneficiaryId,
          aautipay_bank_account_id: peers.aautipayBankAccountId,
        })
        .from(peers)
        .where(eq(peers.id, payout.peer_id))
        .limit(1);

      if (!peer?.payment_ready) {
        // No Aautipay attempt — reviewer hasn't completed onboarding.
        aautipayResult = 'skipped';
        aautipayMessage =
          'Reviewer not paymentReady — internal approval recorded, no external payout initiated.';
      } else {
        // Attempt Aautipay payout. Wrap in try/catch — internal status stays approved.
        try {
          const result = (await aautipay.createPayoutApproval({
            customer_payout_id: payout.id,
            amount: Number(payout.amount),
            payout_reason: `Peerspectiv reviewer payout ${payout.period_start} → ${payout.period_end}`,
            beneficiary_id: peer.aautipay_beneficiary_id ?? '',
            destination_id: peer.aautipay_bank_account_id ?? '',
            country_code: 'US',
            currency: 'USD',
          })) as {
            status?: boolean;
            data?: { payout_id?: string; status?: string };
          };

          const externalPayoutId = result?.data?.payout_id ?? null;
          const externalStatus = result?.data?.status ?? 'submitted';

          await db
            .update(peerPayouts)
            .set({
              aautipayPayoutId: externalPayoutId,
              aautipayPayoutStatus: externalStatus,
              externalPayoutInitiatedAt: new Date(),
            })
            .where(eq(peerPayouts.id, payout.id));

          await db.insert(aautipayEvents).values({
            eventType: 'payout',
            externalId: externalPayoutId ?? payout.id,
            rawPayload: { request: { payoutId: payout.id }, response: result },
            status: 'success',
            processedAt: new Date(),
          });

          aautipayResult = 'submitted';
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unknown error';
          console.error('[payouts] Aautipay createPayoutApproval failed:', message);

          await db
            .update(peerPayouts)
            .set({
              externalFailReason: message,
              externalPayoutInitiatedAt: new Date(),
            })
            .where(eq(peerPayouts.id, payout.id));

          await db.insert(aautipayEvents).values({
            eventType: 'payout',
            externalId: payout.id,
            rawPayload: { request: { payoutId: payout.id, amount: payout.amount } },
            status: 'failed',
            processingError: message,
            processedAt: new Date(),
          });

          aautipayResult = 'failed';
          aautipayMessage = message;
        }
      }
    }

    return NextResponse.json({
      data: toSnake(payout),
      aautipay: aautipayResult,
      aautipayMessage,
    });
  } catch (err) {
    console.error('[API] PATCH /api/payouts/[id] error:', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
