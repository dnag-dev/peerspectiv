import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { aiAnalyses } from '@/lib/db/schema';
import { callClaude } from '@/lib/ai/anthropic';

// POST /api/peer/ai-suggest-narrative
// Body: { case_id: string; draft?: string }
// Returns: { text: string }
//
// Section C.5 — drafts a 3–5 sentence first-person reviewer narrative grounded
// in the existing AI chart analysis. Conservative tone, no invention.
export async function POST(request: NextRequest) {
  try {
    const { case_id, draft } = (await request.json()) as {
      case_id?: string;
      draft?: string;
    };
    if (!case_id) {
      return NextResponse.json(
        { error: 'case_id is required' },
        { status: 400 }
      );
    }

    const [analysis] = await db
      .select({
        chartSummary: aiAnalyses.chartSummary,
        criteriaScores: aiAnalyses.criteriaScores,
        deficiencies: aiAnalyses.deficiencies,
      })
      .from(aiAnalyses)
      .where(eq(aiAnalyses.caseId, case_id))
      .limit(1);

    if (!analysis) {
      return NextResponse.json(
        { error: 'No AI analysis found for this case yet.' },
        { status: 404 }
      );
    }

    const system = [
      "You are an experienced peer-reviewing physician helping a colleague draft the",
      "'comments and recommendations' paragraph for a peer-review record.",
      "Voice: first-person ('I'), conservative, professional, factual.",
      "Length: 3–5 sentences. No bullet lists, no headings.",
      "Strict rule: NEVER invent facts not present in the chart summary, criteria",
      "scores, or deficiencies provided. If something is unclear, omit it rather",
      "than guess. Do not include patient identifiers.",
    ].join(' ');

    const userContent = JSON.stringify(
      {
        chart_summary: analysis.chartSummary ?? null,
        criteria_scores: analysis.criteriaScores ?? [],
        deficiencies: analysis.deficiencies ?? [],
        reviewer_existing_draft: draft ?? null,
      },
      null,
      2
    );

    const text = await callClaude(system, userContent, 600);

    return NextResponse.json({ text: text.trim() });
  } catch (err) {
    console.error('[api/peer/ai-suggest-narrative]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    );
  }
}
