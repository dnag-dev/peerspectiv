import { NextRequest, NextResponse } from 'next/server';
import { and, eq, gte, inArray, isNotNull, lt, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  reviewCases,
  peers,
  providers,
  notifications,
} from '@/lib/db/schema';
import { sendPastDueReminder } from '@/lib/email/notifications';
import { auditLog } from '@/lib/utils/audit';

export const dynamic = 'force-dynamic';

/**
 * Phase 5.4 (SA-092) — daily 09:00 UTC past-due reminder.
 *
 * For every case in_progress whose due_date has passed, email the assigned
 * peer if we haven't already sent a past_due_reminder notification for that
 * case in the last 3 days. We persist a row in the `notifications` table
 * keyed by entityType='review_case' + type='past_due_reminder' for throttle
 * tracking — chosen over a new dedicated table because the schema and
 * indexes already exist (lighter migration footprint).
 */
const THROTTLE_DAYS = 3;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const expected = process.env.CRON_SECRET;
  if (!expected || authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
  }

  try {
    const now = new Date();
    const cutoff = new Date(now.getTime() - THROTTLE_DAYS * 24 * 60 * 60 * 1000);

    // 1. Pull all in_progress cases past due with an assigned peer.
    const overdue = await db
      .select({
        id: reviewCases.id,
        peerId: reviewCases.peerId,
        dueDate: reviewCases.dueDate,
        peerName: peers.fullName,
        peerEmail: peers.email,
        providerFirst: providers.firstName,
        providerLast: providers.lastName,
      })
      .from(reviewCases)
      .leftJoin(peers, eq(reviewCases.peerId, peers.id))
      .leftJoin(providers, eq(reviewCases.providerId, providers.id))
      .where(
        and(
          eq(reviewCases.status, 'in_progress'),
          isNotNull(reviewCases.dueDate),
          lt(reviewCases.dueDate, now),
          isNotNull(reviewCases.peerId)
        )
      );

    if (overdue.length === 0) {
      return NextResponse.json({ scanned: 0, sent: 0, throttled: 0 });
    }

    // 2. Pull recent past_due_reminder notifications to dedupe.
    const caseIds = overdue.map((c) => c.id);
    const recent = await db
      .select({ entityId: notifications.entityId })
      .from(notifications)
      .where(
        and(
          eq(notifications.type, 'past_due_reminder'),
          eq(notifications.entityType, 'review_case'),
          inArray(notifications.entityId, caseIds),
          gte(notifications.createdAt, cutoff)
        )
      );
    const throttled = new Set(recent.map((r) => r.entityId).filter(Boolean) as string[]);

    let sent = 0;
    let skipped = 0;
    for (const c of overdue) {
      if (throttled.has(c.id)) {
        skipped++;
        continue;
      }
      if (!c.peerEmail) {
        skipped++;
        continue;
      }
      const providerName =
        `${c.providerFirst ?? ''} ${c.providerLast ?? ''}`.trim() || 'Unknown';

      // Best-effort send — never block.
      sendPastDueReminder({
        peerEmail: c.peerEmail,
        peerName: c.peerName,
        caseId: c.id,
        providerName,
        dueDate: c.dueDate,
      }).catch((err) => console.error('[past-due cron] send failed:', err));

      // Record the throttle marker even if send fails so we don't spam on
      // every cron tick when Resend is down.
      await db.insert(notifications).values({
        userId: null,
        type: 'past_due_reminder',
        title: `Case past due: ${providerName}`,
        body: `Reminder sent to ${c.peerEmail} for case ${c.id}`,
        entityType: 'review_case',
        entityId: c.id,
      });
      sent++;
    }

    await auditLog({
      action: 'cron_past_due_reminders',
      resourceType: 'review_case',
      metadata: { scanned: overdue.length, sent, throttled: skipped },
    });

    return NextResponse.json({ scanned: overdue.length, sent, throttled: skipped });
  } catch (err) {
    console.error('[API] GET /api/cron/past-due-reminders error:', err);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
