import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { globalSettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET  /api/settings           → list all global settings
 * PUT  /api/settings { settingKey, settingValue, description? }
 *      Upserts on settingKey.
 */
export async function GET() {
  try {
    const rows = await db.select().from(globalSettings);
    return NextResponse.json({ settings: rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { settingKey, settingValue, description } = body as {
      settingKey?: string;
      settingValue?: unknown;
      description?: string;
    };
    if (!settingKey?.trim()) {
      return NextResponse.json(
        { error: 'settingKey is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
    if (settingValue === undefined) {
      return NextResponse.json(
        { error: 'settingValue is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
    const updatedBy =
      req.headers.get('x-demo-user-id')?.trim() || 'admin-demo';
    const now = new Date();
    const [row] = await db
      .insert(globalSettings)
      .values({
        settingKey: settingKey.trim(),
        settingValue: settingValue as any,
        description: description?.trim() || null,
        updatedBy,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: globalSettings.settingKey,
        set: {
          settingValue: settingValue as any,
          description: description?.trim() || null,
          updatedBy,
          updatedAt: now,
        },
      })
      .returning();
    return NextResponse.json({ setting: row });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[settings] PUT failed:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const key = url.searchParams.get('settingKey');
    if (!key) {
      return NextResponse.json({ error: 'settingKey required' }, { status: 400 });
    }
    const [row] = await db
      .delete(globalSettings)
      .where(eq(globalSettings.settingKey, key))
      .returning();
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
