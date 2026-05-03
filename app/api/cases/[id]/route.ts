import { NextRequest, NextResponse } from 'next/server';
import { db, toSnake } from '@/lib/db';
import { reviewCases } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

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
