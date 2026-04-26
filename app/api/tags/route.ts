import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tags } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET  /api/tags          → list all tags ordered by usage_count desc
 * POST /api/tags { name, color?, description? } → create
 */
export async function GET() {
  try {
    const rows = await db
      .select()
      .from(tags)
      .orderBy(desc(tags.usageCount), desc(tags.createdAt));
    return NextResponse.json({ tags: rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[tags] GET failed:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, color, description } = body as {
      name?: string;
      color?: string;
      description?: string;
    };
    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'name is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
    const createdBy =
      req.headers.get('x-demo-user-id')?.trim() || 'admin-demo';
    const [row] = await db
      .insert(tags)
      .values({
        name: name.trim(),
        color: color?.trim() || 'cobalt',
        description: description?.trim() || null,
        createdBy,
      })
      .returning();
    return NextResponse.json({ tag: row }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    // unique-violation friendly message
    if (message.includes('unique') || message.includes('duplicate')) {
      return NextResponse.json(
        { error: 'Tag name already exists', code: 'DUPLICATE' },
        { status: 409 }
      );
    }
    console.error('[tags] POST failed:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
