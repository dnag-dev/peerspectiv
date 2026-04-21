import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data, error } = await supabaseAdmin
      .from('review_cases')
      .select(`
        *,
        provider:providers(id, first_name, last_name, specialty, npi, email),
        reviewer:reviewers(id, full_name, email, specialty, board_certification),
        company:companies(id, name, contact_person, contact_email),
        batch:batches(id, batch_name, status),
        ai_analysis:ai_analyses(
          id, chart_summary, criteria_scores, deficiencies,
          overall_score, documentation_score,
          clinical_appropriateness_score, care_coordination_score,
          narrative_draft, model_used, processing_time_ms, created_at
        ),
        review_result:review_results(
          id, criteria_scores, deficiencies, overall_score,
          narrative_final, ai_agreement_percentage, reviewer_changes,
          quality_score, quality_notes, submitted_at, time_spent_minutes
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Case not found', code: 'NOT_FOUND' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: error.message, code: 'QUERY_FAILED' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error('[API] GET /api/cases/[id] error:', err);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
