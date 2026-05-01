import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';
import {
  companies,
  contracts,
  notifications,
  auditLogs,
} from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { sendEmail } from '@/lib/email/notifications';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function verifyHmac(rawBody: string, headerSig: string | null): boolean {
  const secret = process.env.DOCUSIGN_WEBHOOK_HMAC_SECRET;
  if (!secret || secret === '' || secret.startsWith('stub')) {
    // In production, an unset/stub secret is a hard failure — we will not
    // accept unsigned webhooks. In dev/preview, log and allow through.
    if (process.env.NODE_ENV === 'production') {
      console.error(
        '[DocuSign webhook] HMAC secret unset in production — rejecting.'
      );
      return false;
    }
    console.warn(
      '[DocuSign webhook] HMAC secret not configured — skipping signature verification (non-prod).'
    );
    return true;
  }
  if (!headerSig) return false;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody, 'utf8')
    .digest('base64');
  try {
    const a = Buffer.from(expected);
    const b = Buffer.from(headerSig);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function extractEnvelope(payload: any): {
  envelopeId: string | null;
  status: string | null;
  signerName: string | null;
} {
  // DocuSign Connect payloads vary slightly by format (REST vs XML-as-JSON).
  // Look in a few common places.
  const env =
    payload?.data?.envelopeSummary ??
    payload?.envelopeSummary ??
    payload?.envelope ??
    payload?.data?.envelope ??
    payload;

  const envelopeId: string | null =
    env?.envelopeId ?? payload?.data?.envelopeId ?? payload?.envelopeId ?? null;

  const status: string | null = (
    env?.status ?? payload?.event ?? payload?.data?.envelopeSummary?.status ?? null
  )
    ?.toString()
    .toLowerCase()
    ?.replace(/^envelope-/, '') ?? null;

  const signers =
    env?.recipients?.signers ??
    payload?.data?.envelopeSummary?.recipients?.signers ??
    payload?.recipients?.signers ??
    [];
  const signerName: string | null = signers?.[0]?.name ?? null;

  return { envelopeId, status, signerName };
}

function activateEmailHtml(companyName: string, companyId: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
  return `
<div style="background:#0F2044;padding:32px;font-family:sans-serif;color:#fff;">
  <div style="max-width:600px;margin:0 auto;background:#13264F;border-radius:10px;padding:32px;">
    <h2 style="color:#fff;margin:0 0 16px;">Contract signed — ready to activate</h2>
    <p style="color:#D8DEF0;line-height:1.5;">
      ${companyName} has signed the Service Agreement and Business Associate Agreement.
      You can now activate the client and provision portal access.
    </p>
    <a href="${appUrl}/companies/${companyId}"
       style="display:inline-block;margin-top:20px;background:#1E4DB7;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">
      Activate ${companyName}
    </a>
    <p style="color:#8E9BBF;font-size:12px;margin-top:32px;">
      Peerspectiv &middot; Admin Notification
    </p>
  </div>
</div>
  `.trim();
}

export async function POST(req: NextRequest) {
  let rawBody = '';
  try {
    rawBody = await req.text();
    const headerSig = req.headers.get('x-docusign-signature-1');
    if (!verifyHmac(rawBody, headerSig)) {
      console.warn('[DocuSign webhook] HMAC verification failed');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    let payload: any = {};
    try {
      payload = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      console.warn('[DocuSign webhook] non-JSON payload received');
      return NextResponse.json({ received: true });
    }

    const { envelopeId, status, signerName: webhookSignerName } =
      extractEnvelope(payload);

    if (!envelopeId) {
      console.warn('[DocuSign webhook] no envelope id in payload');
      return NextResponse.json({ received: true });
    }

    const [contract] = await db
      .select()
      .from(contracts)
      .where(eq(contracts.docusignEnvelopeId, envelopeId))
      .limit(1);

    if (!contract) {
      console.warn(
        `[DocuSign webhook] no contract for envelope ${envelopeId} — ignoring`
      );
      return NextResponse.json({ received: true });
    }

    const [company] = contract.companyId
      ? await db
          .select()
          .from(companies)
          .where(eq(companies.id, contract.companyId))
          .limit(1)
      : [];

    const now = new Date();
    const signerIp =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      null;

    if (status === 'completed') {
      const signedBy =
        webhookSignerName || contract.sentToName || 'Unknown Signer';

      await db
        .update(contracts)
        .set({
          status: 'signed',
          signedAt: now,
          signedByName: signedBy,
          signedByIp: signerIp,
          docusignRawWebhook: payload,
          updatedAt: now,
        })
        .where(eq(contracts.id, contract.id));

      if (company) {
        // Section N2 — auto-promote: when envelope completes AND company is
        // currently 'contract_sent', jump straight to 'active_client'.
        // Otherwise just record the signed flags without changing status.
        const nextStatus =
          company.status === 'contract_sent' ? 'active_client' : company.status;
        await db
          .update(companies)
          .set({
            status: nextStatus,
            contractSignedAt: now,
            baaSignedAt: now,
            updatedAt: now,
          })
          .where(eq(companies.id, company.id));
      }

      await db.insert(notifications).values({
        userId: contract.createdBy ?? null,
        type: 'contract_signed',
        title: `Contract signed by ${company?.name ?? 'client'}`,
        body: `${signedBy} signed the Service Agreement and BAA. Ready to activate.`,
        entityType: 'contract',
        entityId: contract.id,
      });

      const adminEmail = process.env.ADMIN_EMAIL;
      if (adminEmail && company) {
        await sendEmail({
          to: adminEmail,
          subject: `✅ ${company.name} signed — ready to activate`,
          html: activateEmailHtml(company.name, company.id),
        });
      }

      await db.insert(auditLogs).values({
        userId: null,
        action: 'contract_signed_webhook',
        resourceType: 'contract',
        resourceId: contract.id,
        ipAddress: signerIp,
        metadata: {
          envelopeId,
          signedBy,
          companyId: company?.id ?? null,
        },
      });
    } else if (status === 'declined') {
      await db
        .update(contracts)
        .set({
          status: 'declined',
          docusignRawWebhook: payload,
          updatedAt: now,
        })
        .where(eq(contracts.id, contract.id));

      if (company) {
        await db
          .update(companies)
          .set({ status: 'prospect', updatedAt: now })
          .where(eq(companies.id, company.id));
      }

      await db.insert(notifications).values({
        userId: contract.createdBy ?? null,
        type: 'contract_declined',
        title: `Contract declined by ${company?.name ?? 'client'}`,
        body: `The signer declined the DocuSign envelope. Company reverted to prospect.`,
        entityType: 'contract',
        entityId: contract.id,
      });

      await db.insert(auditLogs).values({
        userId: null,
        action: 'contract_declined_webhook',
        resourceType: 'contract',
        resourceId: contract.id,
        ipAddress: signerIp,
        metadata: { envelopeId, companyId: company?.id ?? null },
      });
    } else if (status === 'voided') {
      await db
        .update(contracts)
        .set({
          status: 'voided',
          docusignRawWebhook: payload,
          updatedAt: now,
        })
        .where(eq(contracts.id, contract.id));

      await db.insert(auditLogs).values({
        userId: null,
        action: 'contract_voided_webhook',
        resourceType: 'contract',
        resourceId: contract.id,
        ipAddress: signerIp,
        metadata: { envelopeId, companyId: company?.id ?? null },
      });
    } else {
      console.log(
        `[DocuSign webhook] unhandled status="${status}" for envelope ${envelopeId}`
      );
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('[DocuSign webhook] error', err);
    // Always ack so DocuSign doesn't spin on retries
    return NextResponse.json({ received: true });
  }
}
