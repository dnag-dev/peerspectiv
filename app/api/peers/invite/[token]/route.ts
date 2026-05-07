import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { peerInviteTokens, peers, peerSpecialties } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { sendEmail } from '@/lib/email/notifications';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isAdmin(): boolean {
  const raw = cookies().get('demo_user')?.value;
  if (!raw) return false;
  try {
    return JSON.parse(decodeURIComponent(raw)).role === 'admin';
  } catch {
    return false;
  }
}

/**
 * POST /api/peers/invite/[token] — admin approves or rejects a Path A
 * submission.
 *   Body: { action: 'approve' | 'reject', reason?: string }
 * Approve creates a peer in status='pending_credentialing' and writes
 * peer_specialties rows.
 */
export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  if (!isAdmin()) {
    return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as { action?: string; reason?: string };
  if (body.action !== 'approve' && body.action !== 'reject') {
    return NextResponse.json(
      { error: 'action must be approve or reject', code: 'VALIDATION_ERROR' },
      { status: 400 }
    );
  }

  const [row] = await db
    .select()
    .from(peerInviteTokens)
    .where(eq(peerInviteTokens.token, params.token))
    .limit(1);
  if (!row) return NextResponse.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 });
  if (row.submissionStatus !== 'submitted') {
    return NextResponse.json(
      { error: `Token is ${row.submissionStatus}; cannot ${body.action}`, code: 'INVALID_STATE' },
      { status: 409 }
    );
  }

  const sub = (row.submissionData ?? {}) as Record<string, any>;

  if (body.action === 'reject') {
    await db
      .update(peerInviteTokens)
      .set({
        submissionStatus: 'rejected',
        rejectionReason: body.reason ?? null,
        reviewedBy: 'admin',
        reviewedAt: new Date(),
      })
      .where(eq(peerInviteTokens.token, params.token));

    await sendEmail({
      to: row.peerEmail,
      subject: 'Peerspectiv application — update',
      html: `
        <p>Thank you for applying. Your application was not approved at this time.</p>
        ${body.reason ? `<p>Reviewer note: ${body.reason}</p>` : ''}
      `,
    });

    return NextResponse.json({ ok: true, status: 'rejected' });
  }

  // Approve: create peer in pending_credentialing
  const [peer] = await db
    .insert(peers)
    .values({
      fullName: String(sub.full_name ?? ''),
      email: row.peerEmail,
      npi: sub.npi ? String(sub.npi) : null,
      boardCertification: sub.board_certification ? String(sub.board_certification) : null,
      licenseNumber: sub.license_number ? String(sub.license_number) : null,
      licenseState: sub.license_state ? String(sub.license_state) : null,
      licenseFileUrl: sub.license_document_url ? String(sub.license_document_url) : null,
      credentialValidUntil: sub.license_expiry ? String(sub.license_expiry) : null,
      status: 'pending_credentialing',
      statusChangedAt: new Date(),
      statusChangedBy: 'admin',
      statusChangeReason: 'path-a invite approved',
    })
    .returning({ id: peers.id });

  const specs: string[] = Array.isArray(sub.specialties) ? sub.specialties : [];
  for (const s of specs) {
    const trimmed = String(s).trim();
    if (!trimmed) continue;
    await db
      .insert(peerSpecialties)
      .values({ peerId: peer.id, specialty: trimmed, verifiedStatus: 'pending' })
      .onConflictDoNothing();
  }

  await db
    .update(peerInviteTokens)
    .set({
      submissionStatus: 'approved',
      acceptedAt: new Date(),
      reviewedBy: 'admin',
      reviewedAt: new Date(),
      peerId: peer.id,
    })
    .where(eq(peerInviteTokens.token, params.token));

  return NextResponse.json({ ok: true, status: 'approved', peer_id: peer.id });
}
