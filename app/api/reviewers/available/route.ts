import { NextRequest, NextResponse } from 'next/server';
import { db, toSnake } from '@/lib/db';
import { reviewers } from '@/lib/db/schema';
import { and, asc, eq } from 'drizzle-orm';

// GET /api/reviewers/available?specialty=Family%20Medicine
// Returns active + available reviewers matching the given specialty,
// sorted by active_cases_count ascending (least-loaded first).
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const specialty = searchParams.get('specialty');

  const conditions = [eq(reviewers.status, 'active')];
  if (specialty) conditions.push(eq(reviewers.specialty, specialty));

  const rows = await db
    .select({
      id: reviewers.id,
      fullName: reviewers.fullName,
      email: reviewers.email,
      specialty: reviewers.specialty,
      boardCertification: reviewers.boardCertification,
      activeCasesCount: reviewers.activeCasesCount,
      totalReviewsCompleted: reviewers.totalReviewsCompleted,
      availabilityStatus: reviewers.availabilityStatus,
      unavailableUntil: reviewers.unavailableUntil,
      unavailableReason: reviewers.unavailableReason,
      status: reviewers.status,
    })
    .from(reviewers)
    .where(and(...conditions))
    .orderBy(asc(reviewers.activeCasesCount));

  return NextResponse.json({ reviewers: rows.map((r) => toSnake(r)) });
}
