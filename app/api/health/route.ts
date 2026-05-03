import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { companies } from '@/lib/db/schema';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    await db.select({ count: sql<number>`count(*)::int` }).from(companies);

    return NextResponse.json({
      status: 'ok',
      db: true,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      {
        status: 'degraded',
        db: false,
        timestamp: new Date().toISOString(),
        error: err instanceof Error ? err.message : 'Health check failed',
        code: 'DB_CONNECTION_FAILED',
      },
      { status: 503 }
    );
  }
}
