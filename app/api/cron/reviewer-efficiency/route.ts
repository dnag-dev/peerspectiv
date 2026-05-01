import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

const N = 50;

/**
 * Daily cron — recompute `reviewers.avg_minutes_per_chart` from each
 * reviewer's last N=50 review_results. Used by the assignment engine to
 * prefer faster reviewers.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
  }

  try {
    const reviewers = await db.execute<{ id: string }>(sql`SELECT id FROM reviewers`);
    const list = (reviewers as any).rows ?? reviewers;

    let updated = 0;
    let skipped = 0;
    for (const r of list) {
      const id = r.id;
      const rows = await db.execute<{ time_spent_minutes: number }>(sql`
        SELECT time_spent_minutes
        FROM review_results
        WHERE reviewer_id = ${id}
          AND time_spent_minutes IS NOT NULL
          AND time_spent_minutes > 0
        ORDER BY submitted_at DESC NULLS LAST
        LIMIT ${N}
      `);
      const results = (rows as any).rows ?? rows;
      if (!results || results.length === 0) {
        skipped++;
        continue;
      }
      const total = results.reduce(
        (s: number, x: any) => s + Number(x.time_spent_minutes || 0),
        0
      );
      const avg = total / results.length;
      await db.execute(sql`
        UPDATE reviewers SET avg_minutes_per_chart = ${avg.toFixed(2)} WHERE id = ${id}
      `);
      updated++;
    }

    return NextResponse.json({ updated, skipped });
  } catch (err) {
    console.error('[cron/reviewer-efficiency] error', err);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
