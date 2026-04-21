import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { scoreReviewerQuality } from '@/lib/ai/quality-scorer';
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
    const { data: reviewResult, error } = await supabaseAdmin
      .from('review_results')
      .select('id, case_id')
      .eq('case_id', case_id)
      .single();

    if (error || !reviewResult) {
      return NextResponse.json(
        { error: 'No review result found for this case', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    await scoreReviewerQuality(case_id);

    // Fetch updated result
    const { data: updatedResult } = await supabaseAdmin
      .from('review_results')
      .select('quality_score, quality_notes')
      .eq('case_id', case_id)
      .single();

    await auditLog({
      action: 'quality_score_calculated',
      resourceType: 'review_case',
      resourceId: case_id,
      metadata: { quality_score: updatedResult?.quality_score },
      request,
    });

    return NextResponse.json({
      success: true,
      quality_score: updatedResult?.quality_score,
      quality_notes: updatedResult?.quality_notes,
    });
  } catch (err) {
    console.error('[API] POST /api/quality/score error:', err);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
