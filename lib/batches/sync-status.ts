import { db } from '@/lib/db';
import { batches, reviewCases } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

/**
 * Recalculate and sync a batch's status based on the statuses of its cases.
 *
 * Rules:
 *   - If ALL cases are completed → batch = 'completed'
 *   - If ANY case is assigned/in_progress/pending_approval/past_due → batch = 'in_progress'
 *   - If ALL cases are unassigned (or batch has no cases) → batch = 'pending'
 *   - Preserves 'pending_admin_review' (client-submitted batches)
 */
export async function syncBatchStatus(batchId: string): Promise<void> {
  // Get current batch status
  const [batch] = await db
    .select({ status: batches.status })
    .from(batches)
    .where(eq(batches.id, batchId))
    .limit(1);

  if (!batch) return;

  // Don't override client-submitted batch pending admin review
  if (batch.status === 'pending_admin_review') return;

  // Count cases by status category
  const counts = await db
    .select({
      total: sql<number>`count(*)::int`,
      completed: sql<number>`count(*) filter (where status = 'completed')::int`,
      active: sql<number>`count(*) filter (where status in ('assigned', 'in_progress', 'pending_approval', 'past_due'))::int`,
    })
    .from(reviewCases)
    .where(eq(reviewCases.batchId, batchId));

  const { total, completed, active } = counts[0] ?? { total: 0, completed: 0, active: 0 };

  let newStatus: string;
  if (total === 0) {
    newStatus = 'pending';
  } else if (completed === total) {
    newStatus = 'completed';
  } else if (active > 0 || completed > 0) {
    newStatus = 'in_progress';
  } else {
    newStatus = 'pending';
  }

  if (newStatus !== batch.status) {
    await db
      .update(batches)
      .set({ status: newStatus })
      .where(eq(batches.id, batchId));
  }
}
