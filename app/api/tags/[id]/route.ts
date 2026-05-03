import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tags, tagAssociations, caseTags } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * PATCH  /api/tags/[id] { name?, color?, description? }
 * DELETE /api/tags/[id]    → cascades associations
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await req.json();
    const update: Record<string, unknown> = {};
    if (typeof body.name === 'string' && body.name.trim()) update.name = body.name.trim();
    if (typeof body.color === 'string') update.color = body.color.trim() || 'cobalt';
    if ('description' in body) update.description = body.description?.trim?.() || null;
    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'no fields to update' }, { status: 400 });
    }
    const [row] = await db.update(tags).set(update).where(eq(tags.id, id)).returning();
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ tag: row });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    // Phase 6.3 — block delete when case_tags references this tag.
    const used = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(caseTags)
      .where(eq(caseTags.tagId, id));
    const caseCount = used[0]?.n ?? 0;
    if (caseCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete: ${caseCount} case(s) still tagged with this tag.`,
          code: 'IN_USE',
          case_count: caseCount,
        },
        { status: 409 }
      );
    }
    // associations cascade via FK — but explicit clean for safety in case
    // the FK is missing in some env.
    await db.delete(tagAssociations).where(eq(tagAssociations.tagId, id));
    const [row] = await db.delete(tags).where(eq(tags.id, id)).returning();
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
