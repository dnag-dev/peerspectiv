import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { notifications } from '@/lib/db/schema';
import { and, desc, eq, isNull, or, sql } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function resolveUserId(): Promise<string | null> {
  try {
    const { auth } = await import('@clerk/nextjs/server');
    const result = auth();
    const userId = (result as any)?.userId;
    if (userId) return userId as string;
  } catch {
    // Clerk not configured / demo mode
  }
  return null;
}

export async function GET(_req: NextRequest) {
  const userId = await resolveUserId();

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
