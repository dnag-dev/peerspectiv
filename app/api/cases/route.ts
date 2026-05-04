import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq, ne } from 'drizzle-orm';
import { db, toSnake, getCallerScope } from '@/lib/db';
import { reviewCases } from '@/lib/db/schema';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // CL-013 — same scoping rules as /api/cases/[id]. Force company/peer
    // filter onto the query rather than relying on whatever the client
    // sends in query params.
    const scope = await getCallerScope(request);
    if (scope.role === 'unknown' || scope.role === 'credentialer') {
      return NextResponse.json(
        { error: 'Forbidden', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const batch_id = searchParams.get('batch_id');
    const peer_id = searchParams.get('peer_id');
    const company_id = searchParams.get('company_id');

    const conditions = [];
    if (status) conditions.push(eq(reviewCases.status, status));
    if (batch_id) conditions.push(eq(reviewCases.batchId, batch_id));
    if (peer_id) conditions.push(eq(reviewCases.peerId, peer_id));
    if (company_id) conditions.push(eq(reviewCases.companyId, company_id));

    // CL-013 — server-side scope. Ignore any company_id/peer_id query
    // params from a client/peer caller; force their own scope.
    if (scope.role === 'client') {
      if (!scope.companyId) {
        return NextResponse.json({ data: [] });
      }
      conditions.push(eq(reviewCases.companyId, scope.companyId));
    } else if (scope.role === 'peer') {
      if (!scope.peerId) {
        return NextResponse.json({ data: [] });
      }
      conditions.push(eq(reviewCases.peerId, scope.peerId));
    }

    const data = await db.query.reviewCases.findMany({
      where: conditions.length ? and(...conditions) : undefined,
      orderBy: desc(reviewCases.createdAt),
      with: {
        provider: { columns: { id: true, firstName: true, lastName: true, specialty: true, npi: true } },
        peer: { columns: { id: true, fullName: true, email: true } },
        company: { columns: { id: true, name: true } },
        batch: { columns: { id: true, batchName: true } },
      },
    });

    return NextResponse.json({ data: data.map((r) => toSnake(r)) });
  } catch (err) {
    console.error('[API] GET /api/cases error:', err);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      provider_id,
      batch_id,
      company_id,
      peer_id,
      batch_period,
      encounter_date,
      specialty_required,
      priority,
      due_date,
      notes,
      status,
    } = body ?? {};

    // Duplicate case guard — one active case per provider per batch_period
    if (provider_id && batch_period) {
      const existing = await db
        .select({ id: reviewCases.id })
        .from(reviewCases)
        .where(
          and(
            eq(reviewCases.providerId, provider_id),
            eq(reviewCases.batchPeriod, batch_period),
            ne(reviewCases.status, 'archived')
          )
        )
        .limit(1);

      if (existing.length > 0) {
        return NextResponse.json(
          {
            error: 'duplicate_case',
            message: `A review case already exists for this provider in ${batch_period}`,
            existing_case_id: existing[0].id,
          },
          { status: 409 }
        );
      }
    }

    let row;
    try {
      [row] = await db
        .insert(reviewCases)
        .values({
          providerId: provider_id ?? null,
          batchId: batch_id ?? null,
          companyId: company_id ?? null,
          peerId: peer_id ?? null,
          batchPeriod: batch_period ?? null,
          encounterDate: encounter_date ?? null,
          specialtyRequired: specialty_required ?? null,
          priority: priority ?? 'normal',
          dueDate: due_date ? new Date(due_date) : null,
          notes: notes ?? null,
          status: status ?? 'unassigned',
        })
        .returning();
    } catch (err: any) {
      return NextResponse.json(
        { error: err?.message || 'Insert failed', code: 'INSERT_FAILED' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: toSnake(row) }, { status: 201 });
  } catch (err) {
    console.error('[API] POST /api/cases error:', err);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
