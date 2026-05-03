import { callClaude } from './anthropic';
import { db } from '@/lib/db';
import { aiAnalyses, reviewResults, peers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

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
  const [aiAnalysis] = await db
    .select()
    .from(aiAnalyses)
    .where(eq(aiAnalyses.caseId, caseId))
    .limit(1);

  const [reviewResult] = await db
    .select()
    .from(reviewResults)
    .where(eq(reviewResults.caseId, caseId))
    .limit(1);

  if (!aiAnalysis || !reviewResult) return;

  const userPrompt = `AI Analysis:\n${JSON.stringify({
    criteria_scores: aiAnalysis.criteriaScores,
    deficiencies: aiAnalysis.deficiencies,
    overall_score: aiAnalysis.overallScore,
    narrative_draft: aiAnalysis.narrativeDraft,
  }, null, 2)}

Reviewer Submission:\n${JSON.stringify({
    criteria_scores: reviewResult.criteriaScores,
    deficiencies: reviewResult.deficiencies,
    overall_score: reviewResult.overallScore,
    narrative_final: reviewResult.narrativeFinal,
    time_spent_minutes: reviewResult.timeSpentMinutes,
  }, null, 2)}

AI Agreement Rate: ${reviewResult.aiAgreementPercentage}%`;

  const response = await callClaude(QUALITY_SYSTEM_PROMPT, userPrompt);

  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return;

  const quality = JSON.parse(jsonMatch[0]);

  // Update review result with quality scores
  await db
    .update(reviewResults)
    .set({
      qualityScore: quality.quality_score,
      qualityNotes: quality.quality_notes,
    })
    .where(eq(reviewResults.caseId, caseId));

  // Update reviewer's running average
  if (reviewResult.peerId) {
    const [peer] = await db
      .select({
        aiAgreementScore: peers.aiAgreementScore,
        totalReviewsCompleted: peers.totalReviewsCompleted,
      })
      .from(peers)
      .where(eq(peers.id, reviewResult.peerId))
      .limit(1);

    if (peer) {
      const total = peer.totalReviewsCompleted || 0;
      const currentAvg = Number(peer.aiAgreementScore || 0);
      const aiAgreement = Number(reviewResult.aiAgreementPercentage ?? 0);
      const newAvg = total === 0
        ? aiAgreement
        : (currentAvg * total + aiAgreement) / (total + 1);

      await db
        .update(peers)
        .set({
          aiAgreementScore: String(Math.round(newAvg * 100) / 100),
          totalReviewsCompleted: total + 1,
          updatedAt: new Date(),
        })
        .where(eq(peers.id, reviewResult.peerId));
    }
  }
}
