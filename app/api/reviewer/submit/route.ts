import { NextRequest, NextResponse } from 'next/server';
import { and, eq, isNull } from 'drizzle-orm';
import { supabaseAdmin } from '@/lib/supabase/server';
import { scoreReviewerQuality } from '@/lib/ai/quality-scorer';
import { auditLog } from '@/lib/utils/audit';
import { db } from '@/lib/db';
import { retentionSchedule } from '@/lib/db/schema';
import type { CriterionScore, Deficiency, ReviewerChange } from '@/types';

interface SubmitBody {
  case_id: string;
  criteria_scores: CriterionScore[];
  deficiencies: Deficiency[];
  overall_score: number;
  narrative_final: string;
  time_spent_minutes: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: SubmitBody = await request.json();
    const { case_id, criteria_scores, deficiencies, overall_score, narrative_final, time_spent_minutes } = body;

    if (!case_id || !criteria_scores || overall_score == null || !narrative_final) {
      return NextResponse.json(
        { error: 'case_id, criteria_scores, overall_score, and narrative_final are required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // Fetch case and AI analysis for agreement comparison
    const { data: caseData, error: caseError } = await supabaseAdmin
      .from('review_cases')
      .select('id, reviewer_id, status')
      .eq('id', case_id)
      .single();

    if (caseError || !caseData) {
      return NextResponse.json(
        { error: 'Case not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    if (caseData.status === 'completed') {
      return NextResponse.json(
        { error: 'This case has already been submitted', code: 'ALREADY_SUBMITTED' },
        { status: 409 }
      );
    }

    // Fetch AI analysis for comparison
    const { data: aiAnalysis } = await supabaseAdmin
      .from('ai_analyses')
      .select('criteria_scores')
      .eq('case_id', case_id)
      .single();

    // Calculate AI agreement percentage and build reviewer_changes
    let aiAgreementPercentage: number | null = null;
    let reviewerChanges: ReviewerChange[] = [];

    if (aiAnalysis?.criteria_scores && Array.isArray(aiAnalysis.criteria_scores)) {
      const aiScores = aiAnalysis.criteria_scores as CriterionScore[];
      let agreements = 0;
      let total = 0;

      for (const reviewerScore of criteria_scores) {
        const aiScore = aiScores.find((a) => a.criterion === reviewerScore.criterion);
        if (aiScore) {
          total++;
          if (aiScore.score === reviewerScore.score) {
            agreements++;
          } else {
            reviewerChanges.push({
              criterion: reviewerScore.criterion,
              ai_score: aiScore.score,
              reviewer_score: reviewerScore.score,
              reason: reviewerScore.rationale || 'No reason provided',
            });
          }
        }
      }

      aiAgreementPercentage = total > 0 ? Math.round((agreements / total) * 100) : null;
    }

    // Save to review_results
    const { data: result, error: resultError } = await supabaseAdmin
      .from('review_results')
      .upsert({
        case_id,
        reviewer_id: caseData.reviewer_id,
        criteria_scores,
        deficiencies: deficiencies || [],
        overall_score,
        narrative_final,
        ai_agreement_percentage: aiAgreementPercentage,
        reviewer_changes: reviewerChanges,
        time_spent_minutes: time_spent_minutes || null,
        submitted_at: new Date().toISOString(),
      }, { onConflict: 'case_id' })
      .select()
      .single();

    if (resultError) {
      return NextResponse.json(
        { error: resultError.message, code: 'SUBMIT_FAILED' },
        { status: 500 }
      );
    }

    // Update review_cases status to completed
    await supabaseAdmin
      .from('review_cases')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', case_id);

    // Retention hook -- extend chart retention 30 days past review completion.
    try {
      const deleteAfter = new Date();
      deleteAfter.setDate(deleteAfter.getDate() + 30);
      await db
        .update(retentionSchedule)
        .set({ deleteAfter })
        .where(
          and(
            eq(retentionSchedule.entityId, case_id),
            eq(retentionSchedule.entityType, 'chart_file'),
            isNull(retentionSchedule.deletedAt)
          )
        );
    } catch (retentionErr) {
      console.error('[API] retention extend failed for case:', case_id, retentionErr);
    }

    // Decrement reviewer active_cases_count
    if (caseData.reviewer_id) {
      const { data: reviewer } = await supabaseAdmin
        .from('reviewers')
        .select('active_cases_count')
        .eq('id', caseData.reviewer_id)
        .single();

      if (reviewer) {
        await supabaseAdmin
          .from('reviewers')
          .update({
            active_cases_count: Math.max(0, (reviewer.active_cases_count || 0) - 1),
            updated_at: new Date().toISOString(),
          })
          .eq('id', caseData.reviewer_id);
      }
    }

    // Update batch completed count
    const { data: batchCase } = await supabaseAdmin
      .from('review_cases')
      .select('batch_id')
      .eq('id', case_id)
      .single();

    if (batchCase?.batch_id) {
      const { count } = await supabaseAdmin
        .from('review_cases')
        .select('*', { count: 'exact', head: true })
        .eq('batch_id', batchCase.batch_id)
        .eq('status', 'completed');

      await supabaseAdmin
        .from('batches')
        .update({ completed_cases: count || 0 })
        .eq('id', batchCase.batch_id);
    }

    // Trigger quality scoring in the background
    scoreReviewerQuality(case_id).catch((err) => {
      console.error('[API] Quality scoring failed for case:', case_id, err);
    });

    await auditLog({
      action: 'review_submitted',
      resourceType: 'review_case',
      resourceId: case_id,
      metadata: {
        overall_score,
        ai_agreement_percentage: aiAgreementPercentage,
        changes_count: reviewerChanges.length,
        time_spent_minutes,
      },
      request,
    });

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (err) {
    console.error('[API] POST /api/reviewer/submit error:', err);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
