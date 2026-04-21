import { callClaude } from './anthropic';
import { supabaseAdmin } from '@/lib/supabase/server';

const QUALITY_SYSTEM_PROMPT = `You are a senior medical quality assurance director evaluating the work of a peer reviewer.

You have two versions of a peer review for the same medical chart:
1. The AI's initial analysis
2. The human reviewer's final submission

Your job is to assess the QUALITY of the reviewer's work, not just whether they agreed with the AI.

Evaluate and return ONLY valid JSON:
{
  "quality_score": 0-100,
  "quality_notes": "2-3 sentence assessment of the reviewer's work quality. Note: was their critique of AI well-founded? Did they add clinical insight? Was their narrative comprehensive?",
  "flags": []
}

Flag options: "rubber_stamping" if agreement > 98% and time spent < 10 minutes, "superficial_review" if narrative unchanged and all agreed, "thorough_review" if meaningful edits with good rationale`;

export async function scoreReviewerQuality(caseId: string): Promise<void> {
  // Fetch AI analysis and reviewer result
  const { data: aiAnalysis } = await supabaseAdmin
    .from('ai_analyses')
    .select('*')
    .eq('case_id', caseId)
    .single();

  const { data: reviewResult } = await supabaseAdmin
    .from('review_results')
    .select('*')
    .eq('case_id', caseId)
    .single();

  if (!aiAnalysis || !reviewResult) return;

  const userPrompt = `AI Analysis:\n${JSON.stringify({
    criteria_scores: aiAnalysis.criteria_scores,
    deficiencies: aiAnalysis.deficiencies,
    overall_score: aiAnalysis.overall_score,
    narrative_draft: aiAnalysis.narrative_draft,
  }, null, 2)}

Reviewer Submission:\n${JSON.stringify({
    criteria_scores: reviewResult.criteria_scores,
    deficiencies: reviewResult.deficiencies,
    overall_score: reviewResult.overall_score,
    narrative_final: reviewResult.narrative_final,
    time_spent_minutes: reviewResult.time_spent_minutes,
  }, null, 2)}

AI Agreement Rate: ${reviewResult.ai_agreement_percentage}%`;

  const response = await callClaude(QUALITY_SYSTEM_PROMPT, userPrompt);

  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return;

  const quality = JSON.parse(jsonMatch[0]);

  // Update review result with quality scores
  await supabaseAdmin
    .from('review_results')
    .update({
      quality_score: quality.quality_score,
      quality_notes: quality.quality_notes,
    })
    .eq('case_id', caseId);

  // Update reviewer's running average
  if (reviewResult.reviewer_id) {
    const { data: reviewer } = await supabaseAdmin
      .from('reviewers')
      .select('ai_agreement_score, total_reviews_completed')
      .eq('id', reviewResult.reviewer_id)
      .single();

    if (reviewer) {
      const total = reviewer.total_reviews_completed || 0;
      const currentAvg = reviewer.ai_agreement_score || 0;
      const newAvg = total === 0
        ? reviewResult.ai_agreement_percentage
        : (currentAvg * total + (reviewResult.ai_agreement_percentage || 0)) / (total + 1);

      await supabaseAdmin
        .from('reviewers')
        .update({
          ai_agreement_score: Math.round(newAvg * 100) / 100,
          total_reviews_completed: total + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', reviewResult.reviewer_id);
    }
  }
}
