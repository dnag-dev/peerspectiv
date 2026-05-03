import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { reviewResults } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { scorePeerQuality } from '@/lib/ai/quality-scorer';
import { auditLog } from '@/lib/utils/audit';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { case_id } = body as { case_id: string };

    if (!case_id) {
      return NextResponse.json(
        { error: 'case_id is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // Verify case exists and has a review result
    const [reviewResult] = await db
      .select({ id: reviewResults.id, caseId: reviewResults.caseId })
      .from(reviewResults)
      .where(eq(reviewResults.caseId, case_id))
      .limit(1);

    if (!reviewResult) {
      return NextResponse.json(
        { error: 'No review result found for this case', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    await scorePeerQuality(case_id);

    // Fetch updated result
    const [updatedResult] = await db
      .select({
        qualityScore: reviewResults.qualityScore,
        qualityNotes: reviewResults.qualityNotes,
      })
      .from(reviewResults)
      .where(eq(reviewResults.caseId, case_id))
      .limit(1);

    await auditLog({
      action: 'quality_score_calculated',
      resourceType: 'review_case',
      resourceId: case_id,
      metadata: { quality_score: updatedResult?.qualityScore },
      request,
    });

    return NextResponse.json({
      success: true,
      quality_score: updatedResult?.qualityScore,
      quality_notes: updatedResult?.qualityNotes,
    });
  } catch (err) {
    console.error('[API] POST /api/quality/score error:', err);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
