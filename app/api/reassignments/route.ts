import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  caseReassignmentRequests,
  reviewCases,
  peers,
  providers,
  companies,
} from '@/lib/db/schema';
import { sendReassignmentRequestAlert } from '@/lib/email/notifications';

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
  if (req.cookies.get('demo_user')?.value) return 'demo-admin';
  return null;
}

// GET — list reassignment requests, defaults to status=open. Joined with
// case, reviewer, provider, company for the admin queue.
export async function GET(request: NextRequest) {
  const userId = await getAdminUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') ?? 'open';

    const rows = await db
      .select({
        id: caseReassignmentRequests.id,
        caseId: caseReassignmentRequests.caseId,
        peerId: caseReassignmentRequests.peerId,
        reason: caseReassignmentRequests.reason,
        status: caseReassignmentRequests.status,
        createdAt: caseReassignmentRequests.createdAt,
        resolvedAt: caseReassignmentRequests.resolvedAt,
        resolutionNote: caseReassignmentRequests.resolutionNote,
        // case
        caseStatus: reviewCases.status,
        dueDate: reviewCases.dueDate,
        specialtyRequired: reviewCases.specialtyRequired,
        // reviewer
        peerName: peers.fullName,
        peerEmail: peers.email,
        // provider
        providerFirstName: providers.firstName,
        providerLastName: providers.lastName,
        providerSpecialty: providers.specialty,
        providerId: providers.id,
        // company
        companyId: companies.id,
        companyName: companies.name,
      })
      .from(caseReassignmentRequests)
      .leftJoin(reviewCases, eq(caseReassignmentRequests.caseId, reviewCases.id))
      .leftJoin(peers, eq(caseReassignmentRequests.peerId, peers.id))
      .leftJoin(providers, eq(reviewCases.providerId, providers.id))
      .leftJoin(companies, eq(reviewCases.companyId, companies.id))
      .where(eq(caseReassignmentRequests.status, status));

    return NextResponse.json({ data: rows });
  } catch (err) {
    console.error('[API] GET /api/reassignments error:', err);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

// POST — reviewer submits a reassignment request.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { case_id, reason } = body as { case_id?: string; reason?: string };

    if (!case_id || !reason || reason.trim().length < 5) {
      return NextResponse.json(
        { error: 'case_id and reason (min 5 chars) are required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // Look up the case to derive reviewer_id (the case already records the
    // assigned reviewer). Mirrors /api/peer/submit which trusts the case.
    const [caseRow] = await db
      .select({
        id: reviewCases.id,
        peerId: reviewCases.peerId,
        providerId: reviewCases.providerId,
      })
      .from(reviewCases)
      .where(eq(reviewCases.id, case_id))
      .limit(1);

    if (!caseRow) {
      return NextResponse.json(
        { error: 'Case not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const trimmed = reason.trim();
    const requestedAt = new Date();

    // Insert request
    const [inserted] = await db
      .insert(caseReassignmentRequests)
      .values({
        caseId: case_id,
        peerId: caseRow.peerId ?? null,
        reason: trimmed,
        status: 'open',
      })
      .returning();

    // Flag the case
    await db
      .update(reviewCases)
      .set({
        reassignmentRequested: true,
        reassignmentReason: trimmed,
        reassignmentRequestedAt: requestedAt,
        updatedAt: requestedAt,
      })
      .where(eq(reviewCases.id, case_id));

    // Hydrate names for the email (best-effort, errors suppressed)
    let peerName = 'Unknown reviewer';
    let peerEmail: string | null = null;
    let providerName: string | null = null;
    try {
      if (caseRow.peerId) {
        const [r] = await db
          .select({ fullName: peers.fullName, email: peers.email })
          .from(peers)
          .where(eq(peers.id, caseRow.peerId))
          .limit(1);
        peerName = r?.fullName ?? peerName;
        peerEmail = r?.email ?? null;
      }
      if (caseRow.providerId) {
        const [p] = await db
          .select({ firstName: providers.firstName, lastName: providers.lastName })
          .from(providers)
          .where(eq(providers.id, caseRow.providerId))
          .limit(1);
        if (p) {
          providerName = `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim() || null;
        }
      }
    } catch (hydrateErr) {
      console.error('[reassignments] hydrate failed:', hydrateErr);
    }

    // Fire admin email (don't block on failure)
    sendReassignmentRequestAlert({
      caseId: case_id,
      peerName,
      peerEmail,
      providerName,
      reason: trimmed,
    }).catch((err) => console.error('[reassignments] email failed:', err));

    return NextResponse.json({ data: inserted }, { status: 201 });
  } catch (err) {
    console.error('[API] POST /api/reassignments error:', err);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
