import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { peers, aautipayEvents } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { aautipay, type CreateCustomerInput } from '@/lib/aautipay/client';

/**
 * POST /api/reviewers/[id]/onboard-aautipay
 *
 * Reviewer KYC + bank onboarding. Captures the form payload regardless of
 * Aautipay availability (failure is logged to aautipay_events for retry),
 * so admins never lose collected data.
 *
 * On success → updates reviewer row with beneficiary/bank ids and flips
 * paymentReady eligibility once Aautipay reports verified status.
 */

interface OnboardBody {
  // Personal
  first_name: string;
  last_name: string;
  email: string;
  mobile: string;
  mobile_code?: string; // e.g. "+1"
  dob?: string;          // YYYY-MM-DD
  ssn_last_4?: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  country_code?: string; // e.g. "US"
  // Bank
  bank_name: string;
  account_number: string;
  bank_code: string; // routing #
  account_holder_name?: string;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: peerId } = await params;
  let body: OnboardBody;
  try {
    body = (await req.json()) as OnboardBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const required = [
    'first_name', 'last_name', 'email', 'mobile',
    'address', 'city', 'state', 'postal_code',
    'bank_name', 'account_number', 'bank_code',
  ] as const;
  for (const k of required) {
    if (!body[k] || String(body[k]).trim() === '') {
      return NextResponse.json(
        { error: `Missing required field: ${k}` },
        { status: 400 }
      );
    }
  }

  // 1. Persist a "received" event row first so we never lose the payload —
  // even if everything below blows up, ops can retry from this row.
  const [pendingEvent] = await db
    .insert(aautipayEvents)
    .values({
      eventType: 'reviewer_onboard_request',
      externalId: peerId,
      rawPayload: body as unknown as object,
      status: 'received',
    })
    .returning({ id: aautipayEvents.id });

  // 2. Build the createCustomer input and attempt the Aautipay call.
  const customerInput: CreateCustomerInput = {
    country_code: body.country_code ?? 'US',
    currency: 'USD',
    business_type: 'individual',
    personal_info: [
      {
        customer_id: peerId,
        first_name: body.first_name,
        last_name: body.last_name,
        email: body.email,
        mobile: body.mobile,
        mobile_code: body.mobile_code ?? '+1',
        DOB: body.dob,
        ssn_last_4: body.ssn_last_4,
        address: body.address,
        city: body.city,
        state: body.state,
        postal_code: body.postal_code,
        role: 'owner',
        percent_share: 100,
      },
    ],
    bank_info: {
      bank_name: body.bank_name,
      customer_bank_id: `${peerId}-bank`,
      name: body.account_holder_name ?? `${body.first_name} ${body.last_name}`,
      account_number: body.account_number,
      bank_code: body.bank_code,
      primary: true,
    },
  };

  try {
    const result = (await aautipay.createCustomer(customerInput)) as {
      status?: boolean;
      data?: {
        beneficiary_id?: string;
        account_id?: string;
        customer_bank_account_id?: string;
        status?: string;
        bank_status?: string;
      };
    };

    const beneficiaryId =
      result?.data?.beneficiary_id ?? result?.data?.account_id ?? null;
    const beneficiaryStatus = result?.data?.status ?? 'pending';
    const bankAccountId = result?.data?.customer_bank_account_id ?? null;
    const bankStatus = result?.data?.bank_status ?? 'pending';

    await db
      .update(peers)
      .set({
        aautipayBeneficiaryId: beneficiaryId,
        aautipayBeneficiaryStatus: beneficiaryStatus,
        aautipayBankAccountId: bankAccountId,
        aautipayBankStatus: bankStatus,
        w9Status: 'collected',
        // paymentReady stays false until Aautipay webhook confirms verified
      })
      .where(eq(peers.id, peerId));

    await db
      .update(aautipayEvents)
      .set({
        status: 'success',
        processedAt: new Date(),
      })
      .where(eq(aautipayEvents.id, pendingEvent.id));

    return NextResponse.json({
      ok: true,
      aautipay: 'submitted',
      beneficiaryId,
      beneficiaryStatus,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[onboard-aautipay] createCustomer failed:', message);

    // Mark KYC as collected internally so admin knows we have the data
    // even though Aautipay didn't accept it. paymentReady stays false.
    await db
      .update(peers)
      .set({ w9Status: 'collected_pending_aautipay' })
      .where(eq(peers.id, peerId));

    await db
      .update(aautipayEvents)
      .set({
        status: 'failed',
        processingError: message,
        processedAt: new Date(),
      })
      .where(eq(aautipayEvents.id, pendingEvent.id));

    // 200 OK — the user-facing flow succeeded (data captured). The Aautipay
    // failure surfaces via UI status + admin retry path (Phase 5 polish).
    return NextResponse.json({
      ok: true,
      aautipay: 'failed',
      message:
        'KYC and bank info captured. Payment activation deferred — admin will retry.',
      eventId: pendingEvent.id,
    });
  }
}
