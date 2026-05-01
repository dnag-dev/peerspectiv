import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { clientFeedback, notifications, companies } from '@/lib/db/schema';
import { cookies } from 'next/headers';
import { eq } from 'drizzle-orm';
import { desc } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function getCompanyForSession(): Promise<{ id: string; name: string } | null> {
  // Demo mode: read demo_user cookie, resolve company
  const cookieStore = cookies();
  const demoCookie = cookieStore.get('demo_user')?.value;
  if (demoCookie) {
    try {
      const parsed = JSON.parse(demoCookie);
      // Client demo user maps to Hunter Health
      if (parsed.role === 'client') {
        const rows = await db
          .select({ id: companies.id, name: companies.name })
          .from(companies)
          .where(eq(companies.name, 'Hunter Health'))
          .limit(1);
        if (rows.length > 0) return rows[0];
      }
    } catch {
      // ignore parse errors
    }
  }

  // Fallback: first active company
  const rows = await db
    .select({ id: companies.id, name: companies.name })
    .from(companies)
    .where(eq(companies.status, 'active'))
    .limit(1);
  return rows[0] ?? null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      ratingTurnaround,
      ratingReportQuality,
      ratingCommunication,
      ratingOverall,
      wouldRecommend,
      openFeedback,
    } = body;

    const company = await getCompanyForSession();
    const companyId = company?.id ?? null;
    const companyName = company?.name ?? 'Unknown';

    // Get submitter name from demo cookie
    const cookieStore = cookies();
    const demoCookie = cookieStore.get('demo_user')?.value;
    let submittedBy = 'Client User';
    if (demoCookie) {
      try {
        const parsed = JSON.parse(demoCookie);
        submittedBy = parsed.name || submittedBy;
      } catch {}
    }

    const [insertedFeedback] = await db
      .insert(clientFeedback)
      .values({
        companyId,
        submittedBy,
        ratingTurnaround,
        ratingReportQuality,
        ratingCommunication,
        ratingOverall,
        wouldRecommend: wouldRecommend ?? null,
        openFeedback: openFeedback || null,
      })
      .returning({ id: clientFeedback.id });

    // Insert notification for admin — bind entityId so the link works
    await db.insert(notifications).values({
      type: 'client_feedback',
      title: `New feedback from ${companyName}`,
      body: `${submittedBy} submitted feedback (overall: ${ratingOverall}/5)`,
      entityType: 'client_feedback',
      entityId: insertedFeedback?.id ?? null,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Feedback POST error:', err);
    return NextResponse.json(
      { error: 'Failed to save feedback' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const rows = await db
      .select()
      .from(clientFeedback)
      .orderBy(desc(clientFeedback.createdAt))
      .limit(50);

    return NextResponse.json({ feedback: rows });
  } catch (err) {
    console.error('Feedback GET error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch feedback' },
      { status: 500 }
    );
  }
}
