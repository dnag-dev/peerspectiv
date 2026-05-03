import { NextRequest, NextResponse } from 'next/server';
import { db, toSnake } from '@/lib/db';
import { reviewCases, peers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { isAssignable, type PeerState } from '@/lib/peers/state-machine';
import { auditLog } from '@/lib/utils/audit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const row = await db.query.reviewCases.findFirst({
      where: eq(reviewCases.id, id),
      with: {
        provider: {
          columns: { id: true, firstName: true, lastName: true, specialty: true, npi: true, email: true },
        },
        peer: {
          columns: { id: true, fullName: true, email: true, boardCertification: true },
        },
        company: {
          columns: { id: true, name: true, contactPerson: true, contactEmail: true },
        },
        batch: {
          columns: { id: true, batchName: true, status: true },
        },
        aiAnalysis: {
          columns: {
            id: true, chartSummary: true, criteriaScores: true, deficiencies: true,
            overallScore: true, documentationScore: true,
            clinicalAppropriatenessScore: true, careCoordinationScore: true,
            narrativeDraft: true, modelUsed: true, processingTimeMs: true, createdAt: true,
          },
        },
        reviewResult: {
          columns: {
            id: true, criteriaScores: true, deficiencies: true, overallScore: true,
            narrativeFinal: true, aiAgreementPercentage: true, peerChanges: true,
            qualityScore: true, qualityNotes: true, submittedAt: true, timeSpentMinutes: true,
          },
        },
      },
    });

    if (!row) {
      return NextResponse.json(
        { error: 'Case not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Preserve legacy shim API contract: shim returned `ai_analysis` and
    // `review_result` wrapped in arrays for one-to-one joins. Keep the array
    // wrapping so the frontend continues to work unchanged.
    const snake = toSnake<any>(row);
    const data = {
      ...snake,
      ai_analysis: snake.ai_analysis ? [snake.ai_analysis] : [],
      review_result: snake.review_result ? [snake.review_result] : [],
    };

    return NextResponse.json({ data });
  } catch (err) {
    console.error('[API] GET /api/cases/[id] error:', err);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * Phase 5.3 — admin reassign / unassign from the assignments index.
 *
 * Body shapes:
 *   { action: 'reassign', peer_id }   → set peer_id, status='assigned',
 *                                       assignment_source='reassigned'
 *   { action: 'unassign' }            → clear peer_id, status='unassigned'
 *
 * Reassign validates the target peer is state='active'; otherwise returns
 * 422 PEER_NOT_ACTIVE (matches Phase 4 contract on /api/assign/approve).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const action = body?.action as string | undefined;

    if (action === 'reassign') {
      const peerId = body?.peer_id as string | undefined;
      if (!peerId) {
        return NextResponse.json(
          { error: 'peer_id required for reassign', code: 'VALIDATION_ERROR' },
          { status: 400 }
        );
      }
      const [target] = await db
        .select({ state: peers.state })
        .from(peers)
        .where(eq(peers.id, peerId))
        .limit(1);
      if (!target || !isAssignable(target.state as PeerState)) {
        return NextResponse.json(
          { error: 'Peer not in Active state. Cannot assign.', code: 'PEER_NOT_ACTIVE' },
          { status: 422 }
        );
      }
      await db
        .update(reviewCases)
        .set({
          peerId,
          status: 'assigned',
          assignmentSource: 'reassigned',
          assignedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(reviewCases.id, id));
      await auditLog({
        action: 'case_reassigned',
        resourceType: 'review_case',
        resourceId: id,
        metadata: { peer_id: peerId },
        request,
      });
      return NextResponse.json({ ok: true });
    }

    if (action === 'unassign') {
      await db
        .update(reviewCases)
        .set({ peerId: null, status: 'unassigned', updatedAt: new Date() })
        .where(eq(reviewCases.id, id));
      await auditLog({
        action: 'case_unassigned',
        resourceType: 'review_case',
        resourceId: id,
        request,
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json(
      { error: 'Unknown action', code: 'VALIDATION_ERROR' },
      { status: 400 }
    );
  } catch (err) {
    console.error('[API] PATCH /api/cases/[id] error:', err);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
