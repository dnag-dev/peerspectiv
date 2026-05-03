import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { credentialerUsers, peerCredentialingLog } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function requireAdmin(req: NextRequest): Promise<string | null> {
  try {
    const { auth } = await import('@clerk/nextjs/server');
    const userId = (auth() as any)?.userId;
    if (userId) return userId as string;
  } catch {
    /* clerk not configured */
  }
  const demo = req.headers.get('x-demo-user-id') || req.cookies.get('demo_user')?.value;
  return demo?.trim() || null;
}

/** GET — single credentialer + rate change history (from peer_credentialing_log.rate_at_action). */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const [row] = await db
    .select()
    .from(credentialerUsers)
    .where(eq(credentialerUsers.id, params.id))
    .limit(1);
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const history = await db
    .select({
      rateAtAction: peerCredentialingLog.rateAtAction,
      action: peerCredentialingLog.action,
      performedAt: peerCredentialingLog.performedAt,
    })
    .from(peerCredentialingLog)
    .where(eq(peerCredentialingLog.credentialerId, params.id))
    .orderBy(desc(peerCredentialingLog.performedAt))
    .limit(50);

  return NextResponse.json({ data: row, rate_history: history });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await requireAdmin(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { full_name?: string; per_peer_rate?: number | string; is_active?: boolean };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof body.full_name === 'string') update.fullName = body.full_name.trim() || null;
  if (body.per_peer_rate !== undefined) {
    const rate = Number(body.per_peer_rate);
    if (!Number.isFinite(rate) || rate <= 0) {
      return NextResponse.json({ error: 'per_peer_rate must be positive' }, { status: 400 });
    }
    update.perPeerRate = String(rate.toFixed(2));
  }
  if (typeof body.is_active === 'boolean') update.isActive = body.is_active;

  const [row] = await db
    .update(credentialerUsers)
    .set(update)
    .where(eq(credentialerUsers.id, params.id))
    .returning();
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ data: row });
}
