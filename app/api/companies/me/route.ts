export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { companies } from '@/lib/db/schema';

export async function GET() {
  let userId: string | null = null;
  try {
    const a: any = (auth as any)();
    userId = a?.userId ?? null;
  } catch {
    userId = null;
  }

  // Try Clerk-linked company first
  if (userId) {
    const byUser = await db
      .select()
      .from(companies)
      .where(eq(companies.clientUserId, userId))
      .limit(1);
    if (byUser.length) return NextResponse.json(byUser[0]);
  }

  // Demo fallback — same strategy used by the client layout
  const byName = await db
    .select()
    .from(companies)
    .where(eq(companies.name, 'Hunter Health'))
    .limit(1);
  if (byName.length) return NextResponse.json(byName[0]);

  const any = await db.select().from(companies).limit(1);
  if (any.length) return NextResponse.json(any[0]);

  return NextResponse.json({ error: 'No company found' }, { status: 404 });
}
