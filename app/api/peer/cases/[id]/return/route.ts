import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { reviewCases, peers } from '@/lib/db/schema';
import { sql } from 'drizzle-orm';
import { auditLog } from '@/lib/utils/audit';
import { syncBatchStatus } from '@/lib/batches/sync-status';

export const dynamic = 'force-dynamic';

/**
 * Phase 5.2 — peer returns a case (PR-030, SA-067H).
 * Only the currently-assigned peer may return their own case. We resolve
 * the acting peer from the demo_user cookie (matches credentialing/peer
 * conventions) and fall back to a header for non-cookie callers (tests).
 */
async function resolveActingPeerId(req: NextRequest): Promise<string | null> {
  // 1. Header escape hatch for tests / smoke (matches admin pattern).
  const explicit = req.headers.get('x-demo-peer-id');
  if (explicit && explicit.trim()) return explicit.trim();

  // 2. demo_user cookie → email → peers.id
  const raw = cookies().get('demo_user')?.value;
  if (!raw) return null;
  let email: string | null = null;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw));
    email = parsed?.email ?? null;
  } catch {
    return null;
  }
  if (!email) return null;
  const [row] = await db
    .select({ id: peers.id })
    .from(peers)
    .where(eq(peers.email, email))
    .limit(1);
  return row?.id ?? null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const caseId = params.id;
    const body = await request.json().catch(() => ({}));
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : '';

    if (reason.length < 10) {
      return NextResponse.json(
        { error: 'reason is required (min 10 chars)', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const [caseRow] = await db
      .select({ id: reviewCases.id, peerId: reviewCases.peerId, status: reviewCases.status, batchId: reviewCases.batchId })
      .from(reviewCases)
      .where(eq(reviewCases.id, caseId))
      .limit(1);

    if (!caseRow) {
      return NextResponse.json(
        { error: 'Case not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const actingPeerId = await resolveActingPeerId(request);
    if (!actingPeerId || actingPeerId !== caseRow.peerId) {
      return NextResponse.json(
        { error: 'Not assigned to this case', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    const previousPeerId = caseRow.peerId;
    const now = new Date();

    await db
      .update(reviewCases)
      .set({
        status: 'returned_by_peer',
        peerId: null,
        returnedByPeerAt: now,
        returnedReason: reason,
        updatedAt: now,
      })
      .where(eq(reviewCases.id, caseId));

    // Decrement the peer's active case count
    if (previousPeerId) {
      await db
        .update(peers)
        .set({
          activeCasesCount: sql`greatest(${peers.activeCasesCount} - 1, 0)`,
          updatedAt: now,
        })
        .where(eq(peers.id, previousPeerId));
    }

    // Sync batch status (may revert from in_progress → pending)
    if (caseRow.batchId) {
      await syncBatchStatus(caseRow.batchId);
    }

    await auditLog({
      action: 'case_returned_by_peer',
      resourceType: 'review_case',
      resourceId: caseId,
      metadata: { peer_id_old: previousPeerId, reason },
      request,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[API] POST /api/peer/cases/[id]/return error:', err);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
