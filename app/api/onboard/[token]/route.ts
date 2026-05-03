import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { peerInviteTokens } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { sendEmail } from '@/lib/email/notifications';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function loadToken(token: string) {
  const [row] = await db
    .select()
    .from(peerInviteTokens)
    .where(eq(peerInviteTokens.token, token))
    .limit(1);
  return row;
}

function tokenStatus(row: typeof peerInviteTokens.$inferSelect) {
  if (row.acceptedAt || row.peerId) return 'accepted';
  if (row.expiresAt && new Date(row.expiresAt) < new Date()) return 'expired';
  if (row.submissionStatus === 'rejected') return 'rejected';
  return 'open';
}

export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const row = await loadToken(params.token);
  if (!row) return NextResponse.json({ error: 'Token not found', code: 'NOT_FOUND' }, { status: 404 });
  return NextResponse.json({
    peer_email: row.peerEmail,
    expires_at: row.expiresAt,
    status: tokenStatus(row),
    submission: row.submissionData ?? null,
  });
}

/**
 * POST /api/onboard/[token]
 * Public — peer submits their application data. Stored in
 * peer_invite_tokens.submission_data + status='submitted'. Admin is notified.
 */
export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const row = await loadToken(params.token);
  if (!row) return NextResponse.json({ error: 'Invalid token', code: 'NOT_FOUND' }, { status: 404 });

  const status = tokenStatus(row);
  if (status !== 'open') {
    return NextResponse.json(
      { error: `Token is ${status}`, code: 'TOKEN_NOT_OPEN' },
      { status: 410 }
    );
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const required = ['full_name', 'npi', 'license_number', 'license_state', 'license_expiry'];
  for (const k of required) {
    if (!body[k]) {
      return NextResponse.json(
        { error: `${k} is required`, code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
  }

  const submission: Record<string, unknown> = {
    ...body,
    email: row.peerEmail, // email is locked to invite
    submitted_at: new Date().toISOString(),
  };

  await db
    .update(peerInviteTokens)
    .set({
      submissionData: submission,
      submissionStatus: 'submitted',
    })
    .where(eq(peerInviteTokens.token, params.token));

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@peerspectiv.com';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.peerspectiv.ai';
  await sendEmail({
    to: adminEmail,
    subject: `New peer application: ${submission.full_name}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color:#0F2044;">Path A submission</h2>
        <p><strong>${submission.full_name}</strong> (${row.peerEmail}) submitted an application via invite.</p>
        <p><a href="${appUrl}/peers/onboarding-queue">Review in admin queue</a></p>
      </div>
    `,
  });

  return NextResponse.json({ ok: true });
}
