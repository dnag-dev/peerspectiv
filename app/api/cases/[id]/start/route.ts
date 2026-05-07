import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { reviewCases } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { syncBatchStatus } from '@/lib/batches/sync-status';

export const dynamic = 'force-dynamic';

/**
 * POST /api/cases/[id]/start
 *
 * Called when a peer opens a case to start reviewing.
 * Transitions status from 'assigned' → 'in_progress'.
 * Idempotent — no-op if already in_progress or completed.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  const [caseRow] = await db
    .select({ status: reviewCases.status, batchId: reviewCases.batchId })
    .from(reviewCases)
    .where(eq(reviewCases.id, id))
    .limit(1);

  if (!caseRow) {
    return NextResponse.json({ error: 'Case not found' }, { status: 404 });
  }

  // Only transition from 'assigned' → 'in_progress'
  if (caseRow.status !== 'assigned') {
    return NextResponse.json({ ok: true, status: caseRow.status });
  }

  await db
    .update(reviewCases)
    .set({ status: 'in_progress', updatedAt: new Date() })
    .where(eq(reviewCases.id, id));

  // Sync batch status
  if (caseRow.batchId) {
    await syncBatchStatus(caseRow.batchId);
  }

  return NextResponse.json({ ok: true, status: 'in_progress' });
}
