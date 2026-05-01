import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  reviewCycles,
  companies,
  auditLogs,
  reviewResults,
  reviewCases,
} from '@/lib/db/schema';
import { sendCycleCompletionEmail } from '@/lib/email/notifications';

export const dynamic = 'force-dynamic';

/**
 * Daily cron — for each completed review cycle that has not yet been
 * delivered (no audit_logs row with action='cycle_delivery_sent' and
 * resource_id=cycle.id), send the appropriate notification based on the
 * company's `delivery_preference`.
 *
 * Section J1.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized', code: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  let processed = 0;
  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  try {
    const completedCycles = await db
      .select()
      .from(reviewCycles)
      .where(eq(reviewCycles.status, 'completed'));

    for (const cycle of completedCycles) {
      processed++;
      try {
        // Dedupe: skip if already sent
        const existing = await db
          .select({ id: auditLogs.id })
          .from(auditLogs)
          .where(
            and(
              eq(auditLogs.action, 'cycle_delivery_sent'),
              eq(auditLogs.resourceId, cycle.id)
            )
          )
          .limit(1);
        if (existing.length > 0) {
          skipped++;
          continue;
        }

        if (!cycle.companyId) {
          skipped++;
          continue;
        }

        const [company] = await db
          .select()
          .from(companies)
          .where(eq(companies.id, cycle.companyId))
          .limit(1);

        if (!company) {
          skipped++;
          continue;
        }

        const mode = (company.deliveryPreference as
          | 'email'
          | 'portal'
          | 'both'
          | null) ?? 'portal';

        // Build per-result download URLs (fallback approach — we don't have a
        // shared zip helper exported from Section I yet). Use the existing
        // per-report PDF endpoint at /api/reports/[caseId].
        const appUrl =
          process.env.NEXT_PUBLIC_APP_URL || 'https://app.peerspectiv.ai';
        const cycleResults = await db
          .select({ caseId: reviewResults.caseId })
          .from(reviewResults)
          .innerJoin(reviewCases, eq(reviewCases.id, reviewResults.caseId))
          .where(eq(reviewCases.companyId, company.id));
        const urls = cycleResults
          .map((r) =>
            r.caseId ? `${appUrl}/api/reports/${r.caseId}` : null
          )
          .filter((u): u is string => Boolean(u));

        const result = await sendCycleCompletionEmail(
          {
            id: company.id,
            name: company.name,
            contact_email: company.contactEmail ?? null,
          },
          urls,
          mode
        );

        await db.insert(auditLogs).values({
          userId: null,
          action: 'cycle_delivery_sent',
          resourceType: 'review_cycle',
          resourceId: cycle.id,
          metadata: {
            companyId: company.id,
            mode,
            delivery: result.delivery,
            urlCount: urls.length,
          },
        });

        sent++;
      } catch (err) {
        errors.push(
          `cycle ${cycle.id}: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      }
    }

    return NextResponse.json({
      ok: true,
      processed,
      sent,
      skipped,
      errors,
    });
  } catch (err) {
    console.error('[cron/cycle-completion] error:', err);
    return NextResponse.json(
      {
        error: 'Internal error',
        code: 'INTERNAL_ERROR',
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
