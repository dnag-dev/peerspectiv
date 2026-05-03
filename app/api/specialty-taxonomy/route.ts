import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { specialtyTaxonomy } from '@/lib/db/schema';
import { asc } from 'drizzle-orm';

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

/** GET — list all rows (active + inactive) for admin management. */
export async function GET() {
  const rows = await db
    .select()
    .from(specialtyTaxonomy)
    .orderBy(asc(specialtyTaxonomy.name));
  return NextResponse.json({ data: rows });
}

/** POST — create a new specialty (SA-105). */
export async function POST(req: NextRequest) {
  const userId = await requireAdmin(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { name?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const name = (body.name ?? '').trim();
  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });

  try {
    const [row] = await db
      .insert(specialtyTaxonomy)
      .values({ name, isActive: true })
      .returning();
    return NextResponse.json({ data: row });
  } catch (err: any) {
    if (String(err?.message || '').includes('duplicate')) {
      return NextResponse.json({ error: 'Specialty already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: err?.message || 'Internal' }, { status: 500 });
  }
}
