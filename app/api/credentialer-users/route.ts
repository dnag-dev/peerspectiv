import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { credentialerUsers } from '@/lib/db/schema';
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

export async function GET() {
  const rows = await db
    .select()
    .from(credentialerUsers)
    .orderBy(asc(credentialerUsers.email));
  return NextResponse.json({ data: rows });
}

export async function POST(req: NextRequest) {
  const userId = await requireAdmin(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { email?: string; full_name?: string; per_peer_rate?: number | string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const email = (body.email ?? '').trim().toLowerCase();
  const fullName = (body.full_name ?? '').trim() || null;
  const rate = Number(body.per_peer_rate ?? 100);
  if (!email) return NextResponse.json({ error: 'email is required' }, { status: 400 });
  if (!Number.isFinite(rate) || rate <= 0) {
    return NextResponse.json({ error: 'per_peer_rate must be positive' }, { status: 400 });
  }

  try {
    const [row] = await db
      .insert(credentialerUsers)
      .values({ email, fullName, perPeerRate: String(rate.toFixed(2)) })
      .returning();
    return NextResponse.json({ data: row });
  } catch (err: any) {
    if (String(err?.message || '').includes('duplicate')) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: err?.message || 'Internal' }, { status: 500 });
  }
}
