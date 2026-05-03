import { NextRequest, NextResponse } from 'next/server';
import { db, toSnake } from '@/lib/db';
import { peers } from '@/lib/db/schema';
import { and, asc, eq, sql } from 'drizzle-orm';

// GET /api/peers/available?specialty=Family%20Medicine
// Returns active + available peers matching the given specialty,
// sorted by active_cases_count ascending (least-loaded first).
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const specialty = searchParams.get('specialty');

  // Phase 4 (CR-006): only state='active' peers are eligible for assignment.
  const conditions = [eq(peers.state, 'active')];
  // Phase 1.3: filter via peer_specialties join (replaces dropped peers.specialty col)
  if (specialty) conditions.push(sql`exists (select 1 from peer_specialties where peer_id = ${peers.id} and specialty = ${specialty})`);

  const rows = await db
    .select({
      id: peers.id,
      fullName: peers.fullName,
      email: peers.email,
      specialty: sql<string | null>`(select specialty from peer_specialties where peer_id = ${peers.id} order by specialty limit 1)`,
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
