import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { aautipayEvents } from '@/lib/db/schema';
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
    if (status === 'approved') update.approved_at = new Date().toISOString();
    if (status === 'paid') update.paid_at = new Date().toISOString();
    if (notes != null) update.notes = notes;

    // 1. Internal status update — happens regardless of Aautipay outcome.
    const { data: payout, error } = await supabaseAdmin
      .from('reviewer_payouts')
      .update(update)
      .eq('id', id)
      .select(
        'id, reviewer_id, amount, status, period_start, period_end, aautipay_payout_id'
      )
      .single();

    if (error || !payout) {
      console.error('[payouts] patch error:', error);
      return NextResponse.json({ error: 'DB_ERROR' }, { status: 500 });
    }

    // 2. Only attempt Aautipay on transition → approved, and only if we
    // haven't already created a payout for this row.
    let aautipayResult: 'skipped' | 'submitted' | 'failed' = 'skipped';
    let aautipayMessage: string | null = null;

    if (status === 'approved' && !payout.aautipay_payout_id) {
      const { data: reviewer } = await supabaseAdmin
        .from('reviewers')
        .select(
          'full_name, email, payment_ready, aautipay_beneficiary_id, aautipay_bank_account_id'
        )
        .eq('id', payout.reviewer_id)
        .single();

      if (!reviewer?.payment_ready) {
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
            beneficiary_id: reviewer.aautipay_beneficiary_id ?? '',
            destination_id: reviewer.aautipay_bank_account_id ?? '',
            country_code: 'US',
            currency: 'USD',
          })) as {
            status?: boolean;
            data?: { payout_id?: string; status?: string };
          };

          const externalPayoutId = result?.data?.payout_id ?? null;
          const externalStatus = result?.data?.status ?? 'submitted';

          await supabaseAdmin
            .from('reviewer_payouts')
            .update({
              aautipay_payout_id: externalPayoutId,
              aautipay_payout_status: externalStatus,
              external_payout_initiated_at: new Date().toISOString(),
            })
            .eq('id', payout.id);

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

          await supabaseAdmin
            .from('reviewer_payouts')
            .update({
              external_fail_reason: message,
              external_payout_initiated_at: new Date().toISOString(),
            })
            .eq('id', payout.id);

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
      data: payout,
      aautipay: aautipayResult,
      aautipayMessage,
    });
  } catch (err) {
    console.error('[API] PATCH /api/payouts/[id] error:', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
