import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { companySpecialtyRates } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';

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

/** PATCH — edit rate or toggle is_default for a single row (SA-109/SA-111). */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; rateId: string } }
) {
  const userId = await requireAdmin(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (body.rate_amount !== undefined) {
    const n = Number(body.rate_amount);
    if (!Number.isFinite(n) || n <= 0) {
      return NextResponse.json({ error: 'rate_amount must be positive' }, { status: 400 });
    }
    update.rateAmount = String(n.toFixed(2));
    update.effectiveFrom = new Date().toISOString().slice(0, 10);
  }
  if (typeof body.is_default === 'boolean') {
    if (body.is_default === true) {
      // Clear other defaults for this company.
      await db
        .update(companySpecialtyRates)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(eq(companySpecialtyRates.companyId, params.id));
    }
    update.isDefault = body.is_default;
  }

  const [row] = await db
    .update(companySpecialtyRates)
    .set(update)
    .where(and(
      eq(companySpecialtyRates.id, params.rateId),
      eq(companySpecialtyRates.companyId, params.id),
    ))
    .returning();
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ data: row });
}

/** DELETE — remove a per-specialty rate row (SA-110). */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; rateId: string } }
) {
  const userId = await requireAdmin(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [row] = await db
    .delete(companySpecialtyRates)
    .where(and(
      eq(companySpecialtyRates.id, params.rateId),
      eq(companySpecialtyRates.companyId, params.id),
    ))
    .returning();
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
