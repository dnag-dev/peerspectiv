import { NextRequest, NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { caseReassignmentRequests, reviewCases, peers } from '@/lib/db/schema';

export const dynamic = 'force-dynamic';

// PATCH — admin resolves or dismisses a reassignment request.
// Body: { status: 'resolved' | 'dismissed', new_reviewer_id?: string, resolution_note?: string }
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { status, new_reviewer_id, resolution_note } = body as {
      status?: 'resolved' | 'dismissed';
      new_reviewer_id?: string;
      resolution_note?: string;
    };

    if (status !== 'resolved' && status !== 'dismissed') {
      return NextResponse.json(
        { error: "status must be 'resolved' or 'dismissed'", code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // Load the request so we know which case to update.
    const [reqRow] = await db
      .select()
      .from(caseReassignmentRequests)
      .where(eq(caseReassignmentRequests.id, id))
      .limit(1);

    if (!reqRow) {
      return NextResponse.json(
        { error: 'Reassignment request not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    let finalNote = resolution_note?.trim() || null;

    // If resolving via picking a new reviewer, swap reviewer on the case +
    // adjust active_cases_count (decrement old, increment new) to mirror the
    // existing reassign path in /api/assign/approve.
    if (status === 'resolved' && new_reviewer_id) {
      // Look up new reviewer name for the resolution note
      const [newReviewer] = await db
        .select({ fullName: peers.fullName })
        .from(peers)
        .where(eq(peers.id, new_reviewer_id))
        .limit(1);

      const oldReviewerId = reqRow.peerId;

      await db
        .update(reviewCases)
        .set({
          peerId: new_reviewer_id,
          reassignmentRequested: false,
          updatedAt: new Date(),
        })
        .where(eq(reviewCases.id, reqRow.caseId));

      if (oldReviewerId && oldReviewerId !== new_reviewer_id) {
        await db
          .update(peers)
          .set({
            activeCasesCount: sql`GREATEST(0, COALESCE(${peers.activeCasesCount}, 0) - 1)`,
            updatedAt: new Date(),
          })
          .where(eq(peers.id, oldReviewerId));
      }
      await db
        .update(peers)
        .set({
          activeCasesCount: sql`COALESCE(${peers.activeCasesCount}, 0) + 1`,
          updatedAt: new Date(),
        })
        .where(eq(peers.id, new_reviewer_id));

      if (!finalNote) {
        finalNote = `Reassigned to ${newReviewer?.fullName ?? 'new reviewer'}`;
      }
    } else {
      // Dismiss or resolve without picking — just clear the flag on the case.
      await db
        .update(reviewCases)
        .set({
          reassignmentRequested: false,
          updatedAt: new Date(),
        })
        .where(eq(reviewCases.id, reqRow.caseId));
    }

    const [updated] = await db
      .update(caseReassignmentRequests)
      .set({
        status,
        resolutionNote: finalNote,
        resolvedAt: new Date(),
      })
      .where(eq(caseReassignmentRequests.id, id))
      .returning();

    return NextResponse.json({ data: updated });
  } catch (err) {
    console.error('[API] PATCH /api/reassignments/[id] error:', err);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
