import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { peerStateAudit } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const rows = await db
    .select()
    .from(peerStateAudit)
    .where(eq(peerStateAudit.peerId, params.id))
    .orderBy(desc(peerStateAudit.changedAt))
    .limit(100);

  return NextResponse.json({
    entries: rows.map((r) => ({
      id: r.id,
      from_status: r.fromState,
      to_status: r.toState,
      changed_by: r.changedBy,
      change_reason: r.changeReason,
      changed_at: r.changedAt?.toISOString() ?? null,
    })),
  });
}
