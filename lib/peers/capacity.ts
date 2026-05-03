import { db } from '@/lib/db';
import { peers, reviewCases } from '@/lib/db/schema';
import { eq, and, inArray, sql } from 'drizzle-orm';

export interface PeerCapacity {
  max: number;
  load: number;
  free: number;
}

/**
 * load = number of review_cases currently in flight for the peer.
 * free  = max - load, clamped at 0 (covers the "max lowered below current
 * load" scenario so we never report negative free capacity).
 */
export async function getPeerCapacity(peerId: string): Promise<PeerCapacity> {
  const [peerRow] = await db
    .select({ max: peers.maxCaseLoad })
    .from(peers)
    .where(eq(peers.id, peerId))
    .limit(1);

  const max = Number(peerRow?.max ?? 75);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(reviewCases)
    .where(
      and(
        eq(reviewCases.peerId, peerId),
        inArray(reviewCases.status, ['assigned', 'in_progress'])
      )
    );

  const load = Number(count ?? 0);
  const free = Math.max(0, max - load);
  return { max, load, free };
}

/**
 * Pure helper for the math half of capacity — exposed so the state machine
 * (or UI previews) can compute free without a DB round-trip when the load
 * was already fetched.
 */
export function computeFree(max: number, load: number): number {
  return Math.max(0, Number(max) - Number(load));
}
