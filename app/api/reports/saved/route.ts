import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { savedReports } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function getAdminUserId(req: NextRequest): Promise<string | null> {
  try {
    const { auth } = await import('@clerk/nextjs/server');
    const result = auth();
    const userId = (result as any)?.userId;
    if (userId) return userId as string;
  } catch {
    /* clerk not configured */
  }
  const demo = req.headers.get('x-demo-user-id');
  if (demo && demo.trim()) return demo.trim();
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const companyId = url.searchParams.get('companyId');
    const rows = companyId
      ? await db
          .select()
          .from(savedReports)
          .where(eq(savedReports.companyId, companyId))
          .orderBy(desc(savedReports.createdAt))
      : await db.select().from(savedReports).orderBy(desc(savedReports.createdAt)).limit(200);
    return NextResponse.json({ savedReports: rows });
  } catch (err) {
    console.error('[saved-reports] GET failed:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = (await getAdminUserId(req)) ?? 'client-portal';
    const body = await req.json();
    const { companyId, templateKey, reportName, rangeStart, rangeEnd, filters } = body as {
      companyId?: string;
      templateKey: string;
      reportName: string;
      rangeStart?: string;
      rangeEnd?: string;
      filters?: any;
    };

    if (!templateKey || !reportName) {
      return NextResponse.json(
        { error: 'templateKey and reportName required' },
        { status: 400 }
      );
    }

    const [row] = await db
      .insert(savedReports)
      .values({
        companyId: companyId ?? null,
        templateKey,
        reportName,
        rangeStart: rangeStart ?? null,
        rangeEnd: rangeEnd ?? null,
        filters: filters ?? null,
        createdBy: userId,
      })
      .returning();
    return NextResponse.json({ savedReport: row });
  } catch (err) {
    console.error('[saved-reports] POST failed:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
