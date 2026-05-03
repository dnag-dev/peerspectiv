import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'node:crypto';
import { db } from '@/lib/db';
import { peerInviteTokens } from '@/lib/db/schema';
import { sendEmail } from '@/lib/email/notifications';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isAdmin(): boolean {
  const raw = cookies().get('demo_user')?.value;
  if (!raw) return false;
  try {
    const j = JSON.parse(decodeURIComponent(raw));
    return j.role === 'admin';
  } catch {
    return false;
  }
}

/**
 * POST /api/peers/invite — admin-only Path A invite.
 *   { email } → { token, expires_at, peer_email, link }
 * Sends an email with link /onboard/{token}, valid 7 days.
 */
export async function POST(request: NextRequest) {
  if (!isAdmin()) {
    return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as { email?: string };
  const email = (body.email ?? '').trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: 'Valid email is required', code: 'VALIDATION_ERROR' },
      { status: 400 }
    );
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const [row] = await db
    .insert(peerInviteTokens)
    .values({
      peerEmail: email,
      token,
      invitedBy: 'admin',
      expiresAt,
      submissionStatus: 'invited',
    })
    .returning({ token: peerInviteTokens.token, expiresAt: peerInviteTokens.expiresAt });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.peerspectiv.ai';
  const link = `${appUrl}/onboard/${row.token}`;

  await sendEmail({
    to: email,
    subject: 'You are invited to join Peerspectiv',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color:#0F2044;">Welcome to Peerspectiv</h2>
        <p>You've been invited to join as a peer reviewer. Complete your application using the link below — it expires in 7 days.</p>
        <p><a href="${link}" style="background:#1E4DB7;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">Start application</a></p>
        <p style="color:#888;font-size:12px;">${link}</p>
      </div>
    `,
  });

  return NextResponse.json({
    token: row.token,
    expires_at: row.expiresAt,
    peer_email: email,
    link,
  });
}
