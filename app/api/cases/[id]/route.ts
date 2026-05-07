import { NextRequest, NextResponse } from 'next/server';
import { db, toSnake, getCallerScope } from '@/lib/db';
import { reviewCases, peers } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { isAssignable, type PeerStatus } from '@/lib/peers/state-machine';
import { auditLog } from '@/lib/utils/audit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // CL-013 — tenant scoping. Without this, any authenticated client can
    // read any other tenant's case JSON by guessing UUIDs.
    const scope = await getCallerScope(request);
    if (scope.role === 'unknown' || scope.role === 'credentialer') {
      return NextResponse.json(
        { error: 'Forbidden', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    const row = await db.query.reviewCases.findFirst({
      where: eq(reviewCases.id, id),
      with: {
        provider: {
          columns: { id: true, firstName: true, lastName: true, specialty: true, npi: true, email: true },
        },
        peer: {
          columns: { id: true, fullName: true, email: true, boardCertification: true },
        },
        company: {
          columns: { id: true, name: true, contactPerson: true, contactEmail: true },
        },
        batch: {
          columns: { id: true, batchName: true, status: true },
        },
        aiAnalysis: {
          columns: {
            id: true, chartSummary: true, criteriaScores: true, deficiencies: true,
            overallScore: true, documentationScore: true,
            clinicalAppropriatenessScore: true, careCoordinationScore: true,
            narrativeDraft: true, modelUsed: true, processingTimeMs: true, createdAt: true,
          },
        },
        reviewResult: {
          columns: {
            id: true, criteriaScores: true, deficiencies: true, overallScore: true,
            narrativeFinal: true, aiAgreementPercentage: true, peerChanges: true,
            qualityScore: true, qualityNotes: true, submittedAt: true, timeSpentMinutes: true,
          },
        },
      },
    });

    if (!row) {
      return NextResponse.json(
        { error: 'Case not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // CL-013 — tenant filter. Return 404 (not 403) to avoid confirming
    // existence to an attacker probing UUIDs.
    if (scope.role === 'client') {
      if (!scope.companyId || (row as any).companyId !== scope.companyId) {
        return NextResponse.json(
          { error: 'Case not found', code: 'NOT_FOUND' },
          { status: 404 }
        );
      }
    }
    if (scope.role === 'peer') {
      if (!scope.peerId || (row as any).peerId !== scope.peerId) {
        return NextResponse.json(
          { error: 'Case not found', code: 'NOT_FOUND' },
          { status: 404 }
        );
      }
    }

    // Preserve legacy shim API contract: shim returned `ai_analysis` and
    // `review_result` wrapped in arrays for one-to-one joins. Keep the array
    // wrapping so the frontend continues to work unchanged.
    const snake = toSnake<any>(row);
    const data = {
      ...snake,
      ai_analysis: snake.ai_analysis ? [snake.ai_analysis] : [],
      review_result: snake.review_result ? [snake.review_result] : [],
    };

    return NextResponse.json({ data });
  } catch (err) {
    console.error('[API] GET /api/cases/[id] error:', err);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * Phase 5.3 — admin reassign / unassign from the assignments index.
 *
 * Body shapes:
 *   { action: 'reassign', peer_id }   → set peer_id, status='assigned',
 *                                       assignment_source='reassigned'
 *   { action: 'unassign' }            → clear peer_id, status='unassigned'
 *
 * Reassign validates the target peer is status='active'; otherwise returns
 * 422 PEER_NOT_ACTIVE (matches Phase 4 contract on /api/assign/approve).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const action = body?.action as string | undefined;

    if (action === 'reassign') {
      // SA-070: Block reassign of completed reviews
      const [caseRow] = await db
        .select({ status: reviewCases.status })
        .from(reviewCases)
        .where(eq(reviewCases.id, id))
        .limit(1);
      if (caseRow?.status === 'completed') {
        return NextResponse.json(
          { error: 'Cannot reassign a completed review.', code: 'COMPLETED_IMMUTABLE' },
          { status: 409 }
        );
      }

      const peerId = body?.peer_id as string | undefined;
      if (!peerId) {
        return NextResponse.json(
          { error: 'peer_id required for reassign', code: 'VALIDATION_ERROR' },
          { status: 400 }
        );
      }
      const [target] = await db
        .select({ status: peers.status })
        .from(peers)
        .where(eq(peers.id, peerId))
        .limit(1);
      if (!target || !isAssignable(target.status as PeerStatus)) {
        return NextResponse.json(
          { error: 'Peer not in Active status. Cannot assign.', code: 'PEER_NOT_ACTIVE' },
          { status: 422 }
        );
      }
      await db
        .update(reviewCases)
        .set({
          peerId,
          status: 'assigned',
          assignmentSource: 'reassigned',
          assignedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(reviewCases.id, id));
      await auditLog({
        action: 'case_reassigned',
        resourceType: 'review_case',
        resourceId: id,
        metadata: { peer_id: peerId },
        request,
      });
      return NextResponse.json({ ok: true });
    }

    if (action === 'unassign') {
      await db
        .update(reviewCases)
        .set({ peerId: null, status: 'unassigned', updatedAt: new Date() })
        .where(eq(reviewCases.id, id));
      await auditLog({
        action: 'case_unassigned',
        resourceType: 'review_case',
        resourceId: id,
        request,
      });
      return NextResponse.json({ ok: true });
    }

    // ─── Phase 6.5 — generic field edit (no action) ────────────────────────
    // When admin/client edits any AI-populated field, persist the new value
    // AND append the field name to manual_overrides[]. Subsequent AI re-runs
    // (chart upload, /analyze) MUST NOT overwrite a field listed here.
    //
    // Whitelisted field map: input-key → DB column (camelCase) + override-tag.
    const FIELD_MAP: Record<
      string,
      { col: keyof typeof reviewCases.$inferSelect; tag: string }
    > = {
      specialty: { col: 'specialtyRequired', tag: 'specialty' },
      specialty_required: { col: 'specialtyRequired', tag: 'specialty' },
      provider_id: { col: 'providerId', tag: 'provider' },
      company_form_id: { col: 'companyFormId', tag: 'company_form_id' },
      mrn_number: { col: 'mrnNumber', tag: 'mrn' },
      cadence_period_label: {
        col: 'cadencePeriodLabel',
        tag: 'cadence_period_label',
      },
    };

    const updates: Record<string, unknown> = {};
    const newOverrides: string[] = [];
    for (const [key, val] of Object.entries(body ?? {})) {
      const m = FIELD_MAP[key];
      if (!m) continue;
      updates[m.col as string] = val ?? null;
      if (!newOverrides.includes(m.tag)) newOverrides.push(m.tag);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'Unknown action', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // Append (de-duped) to manual_overrides[] using array_append-safe SQL.
    // Drizzle doesn't have a clean concat-distinct helper here; we read,
    // merge, and write back inside a single statement via SQL.
    const overridesSql = sql`(
      SELECT ARRAY(SELECT DISTINCT unnest(
        COALESCE(${reviewCases.manualOverrides}, ARRAY[]::text[])
        || ${newOverrides}::text[]
      ))
    )`;
    (updates as any).manualOverrides = overridesSql;
    (updates as any).updatedAt = new Date();

    await db.update(reviewCases).set(updates).where(eq(reviewCases.id, id));
    await auditLog({
      action: 'case_field_updated',
      resourceType: 'review_case',
      resourceId: id,
      metadata: { fields: newOverrides },
      request,
    });
    return NextResponse.json({ ok: true, manual_overrides_added: newOverrides });
  } catch (err) {
    console.error('[API] PATCH /api/cases/[id] error:', err);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
