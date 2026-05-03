import { NextRequest, NextResponse } from 'next/server';
import { db, toSnake } from '@/lib/db';
import { peers } from '@/lib/db/schema';
import { and, asc, eq } from 'drizzle-orm';

// GET /api/reviewers/available?specialty=Family%20Medicine
// Returns active + available reviewers matching the given specialty,
// sorted by active_cases_count ascending (least-loaded first).
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const specialty = searchParams.get('specialty');

  const conditions = [eq(peers.status, 'active')];
  if (specialty) conditions.push(eq(peers.specialty, specialty));

  const rows = await db
    .select({
      id: peers.id,
      fullName: peers.fullName,
      email: peers.email,
      specialty: peers.specialty,
      boardCertification: peers.boardCertification,
      activeCasesCount: peers.activeCasesCount,
      totalReviewsCompleted: peers.totalReviewsCompleted,
      availabilityStatus: peers.availabilityStatus,
      unavailableUntil: peers.unavailableUntil,
      unavailableReason: peers.unavailableReason,
      status: peers.status,
    })
    .from(peers)
    .where(and(...conditions))
    .orderBy(asc(peers.activeCasesCount));

  return NextResponse.json({ peers: rows.map((r) => toSnake(r)) });
}
