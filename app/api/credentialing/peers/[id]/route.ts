import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import {
  peers,
  peerCredentialingLog,
  credentialerUsers,
} from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { transitionPeer, PeerStateTransitionError } from '@/lib/peers/state-machine';

export const dynamic = 'force-dynamic';

/**
 * Resolve the acting credentialer from the demo_user cookie. Returns the
 * credentialer_users row + actor email for audit. Admin acts as themselves
 * (no credentialer_users row, returns email).
 */
async function resolveActor(): Promise<{
  email: string;
  role: 'credentialer' | 'admin' | 'unknown';
  credentialerId: string | null;
  rate: number | null;
}> {
  const raw = cookies().get('demo_user')?.value;
  if (!raw) return { email: 'system', role: 'unknown', credentialerId: null, rate: null };
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as { role?: string; email?: string };
    const role = parsed.role === 'admin' || parsed.role === 'credentialer' ? parsed.role : 'unknown';
    const email = parsed.email ?? 'system';
    if (role === 'credentialer') {
      const [row] = await db
        .select({ id: credentialerUsers.id, perPeerRate: credentialerUsers.perPeerRate })
        .from(credentialerUsers)
        .where(eq(credentialerUsers.email, email))
        .limit(1);
      return {
        email,
        role,
        credentialerId: row?.id ?? null,
        rate: row?.perPeerRate != null ? Number(row.perPeerRate) : null,
      };
    }
    return { email, role: role as 'admin' | 'unknown', credentialerId: null, rate: null };
  } catch {
    return { email: 'system', role: 'unknown', credentialerId: null, rate: null };
  }
}

function authorize(role: string): NextResponse | null {
  if (role !== 'credentialer' && role !== 'admin') {
    return NextResponse.json(
      { error: 'Forbidden', code: 'FORBIDDEN' },
      { status: 403 }
    );
  }
  return null;
}

/**
 * PATCH /api/credentialing/peers/[id]
 * License document + expiry update.
 *   { license_document_url?, credential_valid_until?, license_number?, license_state? }
 *
 * If peer is in license_expired AND a new expiry/document is supplied, the
 * peer transitions back to active. Otherwise it's a metadata-only update.
 * Either way, an entry is written to peer_credentialing_log with action='renewed'.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const actor = await resolveActor();
  const denied = authorize(actor.role);
  if (denied) return denied;

  try {
    const body = (await request.json()) as {
      license_document_url?: string | null;
      credential_valid_until?: string | null;
      license_number?: string | null;
      license_state?: string | null;
    };

    const [existing] = await db
      .select({
        id: peers.id,
        status: peers.status,
        credentialValidUntil: peers.credentialValidUntil,
      })
      .from(peers)
      .where(eq(peers.id, params.id))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: 'Peer not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (body.license_document_url !== undefined) updates.licenseFileUrl = body.license_document_url;
    if (body.credential_valid_until !== undefined) updates.credentialValidUntil = body.credential_valid_until;
    if (body.license_number !== undefined) updates.licenseNumber = body.license_number;
    if (body.license_state !== undefined) updates.licenseState = body.license_state;

    if (Object.keys(updates).length > 1) {
      await db.update(peers).set(updates).where(eq(peers.id, params.id));
    }

    let transitioned = false;
    if (existing.status === 'license_expired' && body.credential_valid_until) {
      try {
        await transitionPeer(params.id, 'active', actor.email, 'license renewed');
        transitioned = true;
      } catch (err) {
        if (!(err instanceof PeerStateTransitionError)) throw err;
      }
    }

    await db.insert(peerCredentialingLog).values({
      peerId: params.id,
      credentialerId: actor.credentialerId,
      action: 'renewed',
      validUntilOld: existing.credentialValidUntil ?? null,
      validUntilNew: body.credential_valid_until ?? existing.credentialValidUntil ?? null,
      documentUrl: body.license_document_url ?? null,
      rateAtAction: actor.rate?.toString() ?? null,
      notes: transitioned ? 'reactivated from license_expired' : 'metadata update',
    });

    return NextResponse.json({ ok: true, transitioned });
  } catch (err) {
    console.error('[API] PATCH /api/credentialing/peers/[id] error:', err);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/credentialing/peers/[id]
 * Mark peer credentialed: pending_credentialing → active.
 *   { credential_valid_until }
 *
 * Blocked if peer has no license document on file.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const actor = await resolveActor();
  const denied = authorize(actor.role);
  if (denied) return denied;

  try {
    const body = (await request.json()) as { credential_valid_until?: string };
    if (!body.credential_valid_until) {
      return NextResponse.json(
        { error: 'credential_valid_until is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const [existing] = await db
      .select({
        id: peers.id,
        status: peers.status,
        licenseFileUrl: peers.licenseFileUrl,
        credentialValidUntil: peers.credentialValidUntil,
      })
      .from(peers)
      .where(eq(peers.id, params.id))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: 'Peer not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }
    if (!existing.licenseFileUrl) {
      return NextResponse.json(
        { error: 'License document required', code: 'LICENSE_DOCUMENT_REQUIRED' },
        { status: 422 }
      );
    }

    await db
      .update(peers)
      .set({
        credentialValidUntil: body.credential_valid_until,
        status: 'active',
        updatedAt: new Date(),
      })
      .where(eq(peers.id, params.id));

    try {
      await transitionPeer(params.id, 'active', actor.email, 'marked credentialed');
    } catch (err) {
      if (err instanceof PeerStateTransitionError) {
        return NextResponse.json(
          { error: err.message, code: 'INVALID_TRANSITION' },
          { status: 409 }
        );
      }
      throw err;
    }

    await db.insert(peerCredentialingLog).values({
      peerId: params.id,
      credentialerId: actor.credentialerId,
      action: 'marked_credentialed',
      validUntilOld: existing.credentialValidUntil ?? null,
      validUntilNew: body.credential_valid_until,
      documentUrl: existing.licenseFileUrl,
      rateAtAction: actor.rate?.toString() ?? null,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[API] POST /api/credentialing/peers/[id] error:', err);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
