import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { peerCredentialingLog } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const rows = await db
    .select()
    .from(peerCredentialingLog)
    .where(eq(peerCredentialingLog.peerId, params.id))
    .orderBy(desc(peerCredentialingLog.performedAt))
    .limit(50);

  return NextResponse.json({
    entries: rows.map((r) => ({
      id: r.id,
      action: r.action,
      valid_until_old: r.validUntilOld,
      valid_until_new: r.validUntilNew,
      document_url: r.documentUrl,
      notes: r.notes,
      performed_at: r.performedAt?.toISOString() ?? null,
    })),
  });
}
