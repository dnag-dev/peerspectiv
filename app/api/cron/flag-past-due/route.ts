import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { reviewCases, peers, notifications } from '@/lib/db/schema';
import { and, eq, inArray, isNotNull, lt, lte, ne } from 'drizzle-orm';
import { auditLog } from '@/lib/utils/audit';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Verify CRON_SECRET from Authorization header
    const authHeader = request.headers.get('authorization');
    const expectedSecret = process.env.CRON_SECRET;

    if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const now = new Date();

    // Find cases that are past due
    const pastDueCases = await db
      .select({ id: reviewCases.id })
      .from(reviewCases)
      .where(
        and(
          inArray(reviewCases.status, ['assigned', 'in_progress']),
          lt(reviewCases.dueDate, now),
          isNotNull(reviewCases.dueDate)
        )
      );

    const caseIds = pastDueCases.map((c) => c.id);

    if (caseIds.length > 0) {
      await db
        .update(reviewCases)
        .set({ status: 'past_due', updatedAt: new Date() })
        .where(inArray(reviewCases.id, caseIds));
    }

    await auditLog({
      action: 'cron_flag_past_due',
      resourceType: 'review_case',
      metadata: { flagged_count: caseIds.length, case_ids: caseIds },
    });

    // Auto-return peers whose unavailable_until has passed
    const today = new Date().toISOString().split('T')[0];
    const expiredPeers = await db
      .select({ id: peers.id, fullName: peers.fullName })
      .from(peers)
      .where(
        and(
          ne(peers.availabilityStatus, 'available'),
          lte(peers.unavailableUntil, today),
          isNotNull(peers.unavailableUntil)
        )
      );

    const returnedIds: string[] = [];
    for (const peer of expiredPeers) {
      await db
        .update(peers)
        .set({
          availabilityStatus: 'available',
          unavailableFrom: null,
          unavailableUntil: null,
          unavailableReason: null,
          updatedAt: new Date(),
        })
        .where(eq(peers.id, peer.id));

      await db.insert(notifications).values({
        userId: null,
        type: 'peer_returned',
        title: `${peer.fullName} is now available`,
        body: `Peer ${peer.fullName} has been automatically marked as available (leave period ended).`,
        entityType: 'peer',
        entityId: peer.id,
      });

      returnedIds.push(peer.id);
    }

    return NextResponse.json({ flagged: caseIds.length, peers_returned: returnedIds.length });
  } catch (err) {
    console.error('[API] GET /api/cron/flag-past-due error:', err);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
