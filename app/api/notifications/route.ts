import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { notifications } from '@/lib/db/schema';
import { and, desc, eq, isNull, or, sql } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function resolveUserId(req?: NextRequest): Promise<string | null> {
  try {
    const { auth } = await import('@clerk/nextjs/server');
    const result = auth();
    const userId = (result as any)?.userId;
    if (userId) return userId as string;
  } catch {
    // Clerk not configured / demo mode
  }
  // Demo path: only honor demo_user cookie or x-demo-user-id header
  if (req) {
    const demo = req.headers.get('x-demo-user-id');
    if (demo && demo.trim()) return demo.trim();
    if (req.cookies.get('demo_user')?.value) return 'demo-admin';
  }
  return null;
}

export async function GET(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Demo mode: show any notifications. Authenticated: show user's + global (null userId).
  const rows = userId
    ? await db
        .select()
        .from(notifications)
        .where(
          or(eq(notifications.userId, userId), isNull(notifications.userId))
        )
        .orderBy(desc(notifications.createdAt))
        .limit(10)
    : await db
        .select()
        .from(notifications)
        .orderBy(desc(notifications.createdAt))
        .limit(10);

  const [unreadRow] = userId
    ? await db
        .select({ count: sql<number>`count(*)::int` })
        .from(notifications)
        .where(
          and(
            or(
              eq(notifications.userId, userId),
              isNull(notifications.userId)
            ),
            isNull(notifications.readAt)
          )
        )
    : await db
        .select({ count: sql<number>`count(*)::int` })
        .from(notifications)
        .where(isNull(notifications.readAt));

  return NextResponse.json({
    notifications: rows,
    unreadCount: Number(unreadRow?.count ?? 0),
  });
}
