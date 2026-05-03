import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { specialtyTaxonomy, peerSpecialties } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

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

/**
 * PATCH — rename and/or activate/deactivate a specialty (SA-105/106).
 * Deactivation (is_active=false) is BLOCKED if any peer currently maps to
 * the specialty via peer_specialties — soft-fails with a 409 conflict so
 * the user can reassign first.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = await requireAdmin(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { name?: string; is_active?: boolean; isActive?: boolean };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const [existing] = await db
    .select()
    .from(specialtyTaxonomy)
    .where(eq(specialtyTaxonomy.id, params.id))
    .limit(1);
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const isActiveRaw = body.is_active ?? body.isActive;
  const requestingDeactivate = isActiveRaw === false;

  if (requestingDeactivate) {
    // Block when peers are currently assigned (SA-106).
    const inUse = await db.execute(sql`
      SELECT COUNT(*)::int AS n FROM peer_specialties WHERE specialty = ${existing.name}
    `);
    const n = Number((inUse as any).rows?.[0]?.n ?? 0);
    if (n > 0) {
      return NextResponse.json(
        {
          error: `Cannot deactivate: in use by ${n} peer${n === 1 ? '' : 's'}`,
          code: 'IN_USE',
          peer_count: n,
        },
        { status: 409 }
      );
    }
  }

  const newName = typeof body.name === 'string' ? body.name.trim() : undefined;
  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (newName) update.name = newName;
  if (typeof isActiveRaw === 'boolean') update.isActive = isActiveRaw;

  try {
    const [row] = await db
      .update(specialtyTaxonomy)
      .set(update)
      .where(eq(specialtyTaxonomy.id, params.id))
      .returning();
    return NextResponse.json({ data: row });
  } catch (err: any) {
    if (String(err?.message || '').includes('duplicate')) {
      return NextResponse.json({ error: 'Specialty name already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: err?.message || 'Internal' }, { status: 500 });
  }
}

/** DELETE — alias for PATCH is_active=false (never hard-delete). */
export async function DELETE(req: NextRequest, ctx: { params: { id: string } }) {
  // Re-route through the same body shape PATCH expects.
  const fauxReq = new NextRequest(req.url, {
    method: 'PATCH',
    headers: req.headers,
    body: JSON.stringify({ is_active: false }),
  });
  return PATCH(fauxReq, ctx);
}
