import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  retentionSchedule,
  reviewCases,
  aiAnalyses,
  auditLogs,
} from '@/lib/db/schema';
import { and, eq, isNull, lt } from 'drizzle-orm';
import { deleteChart } from '@/lib/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (
    request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const toDelete = await db
    .select()
    .from(retentionSchedule)
    .where(
      and(
        lt(retentionSchedule.deleteAfter, now),
        isNull(retentionSchedule.deletedAt)
      )
    )
    .limit(50);

  if (toDelete.length === 0) {
    return NextResponse.json({ deleted: 0 });
  }

  let deleted = 0;
  const errors: string[] = [];

  for (const item of toDelete) {
    try {
      if (item.entityType === 'chart_file' && item.storagePath) {
        try {
          await deleteChart(item.storagePath);
        } catch (se) {
          console.warn(
            '[retention] storage delete failed, continuing:',
            se
          );
        }

        // Clear the path on the review_case
        await db
          .update(reviewCases)
          .set({
            chartFilePath: null,
            chartFileName: null,
            updatedAt: now,
          })
          .where(eq(reviewCases.id, item.entityId));

        // Clear extracted text on analysis (keep scores + metadata for 7-year retention)
        await db
          .update(aiAnalyses)
          .set({ chartTextExtracted: null })
          .where(eq(aiAnalyses.caseId, item.entityId));
      }

      await db
        .update(retentionSchedule)
        .set({ deletedAt: now, deletedBy: 'cron' })
        .where(eq(retentionSchedule.id, item.id));

      await db.insert(auditLogs).values({
        userId: null,
        action: 'phi_deleted_retention',
        resourceType: item.entityType,
        resourceId: item.entityId,
        metadata: {
          storage_path: item.storagePath,
          scheduled_for: item.deleteAfter?.toISOString() ?? null,
        },
      });

      deleted++;
    } catch (err: any) {
      errors.push(`${item.id}: ${err?.message ?? String(err)}`);
      console.error('[retention]', err);
    }
  }

  return NextResponse.json({
    deleted,
    errors: errors.length ? errors : undefined,
  });
}
