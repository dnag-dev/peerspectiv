import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { savedReports, reportRuns } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const [row] = await db
      .select()
      .from(savedReports)
      .where(eq(savedReports.id, params.id))
      .limit(1);
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const runs = await db
      .select()
      .from(reportRuns)
      .where(eq(reportRuns.savedReportId, params.id))
      .orderBy(desc(reportRuns.createdAt))
      .limit(20);
    return NextResponse.json({ savedReport: row, runs });
  } catch (err) {
    console.error('[saved-reports.id] GET failed:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await db.delete(savedReports).where(eq(savedReports.id, params.id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[saved-reports.id] DELETE failed:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
