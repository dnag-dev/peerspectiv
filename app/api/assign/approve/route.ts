import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { reviewCases, batches, peers } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { isAssignable, type PeerState } from '@/lib/peers/state-machine';
import { approveAssignment } from '@/lib/ai/assignment-engine';
import { getPeerCapacity } from '@/lib/peers/capacity';
import { sendCaseAssignedAlert } from '@/lib/email/notifications';
import { auditLog } from '@/lib/utils/audit';
import { calculateProjectedCompletion } from '@/lib/utils/completion';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { case_id, batch_id, approve_all, reassign_to, company_form_id, case_ids, reject } = body as {
      case_id?: string;
      batch_id?: string;
      approve_all?: boolean;
      reassign_to?: string;
      company_form_id?: string;
      case_ids?: string[];
      reject?: boolean;
    };

    // SA-067D: Reject AI suggestion — reset case to unassigned
    if (case_id && reject) {
      await db
        .update(reviewCases)
        .set({
          peerId: null,
          status: 'unassigned',
          assignmentSource: 'manual',
          updatedAt: new Date(),
        })
        .where(eq(reviewCases.id, case_id));
      await auditLog({
        action: 'assignment_rejected',
        resourceType: 'review_case',
        resourceId: case_id,
        metadata: { reason: 'AI suggestion rejected by admin' },
        request,
      });
      return NextResponse.json({ ok: true, rejected: true });
    }

    if (!case_id && !(batch_id && approve_all)) {
      return NextResponse.json(
        { error: 'Provide case_id for single approval, or batch_id with approve_all: true', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // Optional reassign: swap peer_id before approval. Used by manual peer picker.
    if (case_id && reassign_to) {
      // Phase 4 (CR-006/SA-031F): block server-side if target peer is not Active.
      const [targetPeer] = await db
        .select({ state: peers.state })
        .from(peers)
        .where(eq(peers.id, reassign_to))
        .limit(1);
      if (!targetPeer || !isAssignable(targetPeer.state as PeerState)) {
        return NextResponse.json(
          { error: 'Peer not in Active state. Cannot assign.', code: 'PEER_NOT_ACTIVE' },
          { status: 422 }
        );
      }
      await db
        .update(reviewCases)
        .set({ peerId: reassign_to, updatedAt: new Date() })
        .where(eq(reviewCases.id, case_id));
    }
    // Optional form override: record which company-approved form applies.
    if (case_id && company_form_id) {
      await db
        .update(reviewCases)
        .set({ companyFormId: company_form_id, updatedAt: new Date() })
        .where(eq(reviewCases.id, case_id));
    }

    if (approve_all && batch_id) {
      // Phase 5.5 (SA-074A) — walk approvals one at a time and guard each
      // against the target peer's current capacity. If approving the next
      // case would push that peer's load over max_case_load, skip with a
      // reason so the client can render a "Capacity hit — skipped" chip.
      // Optional `case_ids` body lets the caller restrict the walk; default
      // is every pending_approval case in the batch.
      const pendingCases = await db.query.reviewCases.findMany({
        where: and(
          eq(reviewCases.batchId, batch_id),
          eq(reviewCases.status, 'pending_approval')
        ),
        columns: { id: true, peerId: true },
      });

      const requested = Array.isArray(case_ids) && case_ids.length > 0
        ? new Set(case_ids)
        : null;
      const walk = requested
        ? pendingCases.filter((c) => requested.has(c.id))
        : pendingCases;

      const approved: string[] = [];
      const skipped: { caseId: string; reason: string }[] = [];

      // In-memory free-capacity counter per peer so the second case approved
      // for the same peer in this loop sees the decremented load.
      const freeByPeer = new Map<string, number>();
      for (const c of walk) {
        if (!c.peerId) {
          skipped.push({ caseId: c.id, reason: 'No peer assigned' });
          continue;
        }
        let free = freeByPeer.get(c.peerId);
        if (free === undefined) {
          const cap = await getPeerCapacity(c.peerId);
          free = cap.free;
        }
        if (free <= 0) {
          skipped.push({ caseId: c.id, reason: 'Capacity hit — skipped, retry later' });
          freeByPeer.set(c.peerId, 0);
          continue;
        }
        await approveAssignment(c.id);
        approved.push(c.id);
        freeByPeer.set(c.peerId, free - 1);
      }

      // Send emails to all newly assigned peers in the batch (Phase 5.4 SA-091).
      const assignedCases = await db.query.reviewCases.findMany({
        where: and(eq(reviewCases.batchId, batch_id), eq(reviewCases.status, 'assigned')),
        columns: { id: true, specialtyRequired: true, dueDate: true },
        with: {
          peer: { columns: { fullName: true, email: true } },
          provider: { columns: { firstName: true, lastName: true } },
        },
      });

      for (const c of assignedCases) {
        if (!approved.includes(c.id)) continue; // only newly approved this call
        const peer = c.peer;
        if (peer?.email) {
          const providerName = c.provider
            ? `${c.provider.firstName ?? ''} ${c.provider.lastName ?? ''}`.trim() || 'Unknown'
            : 'Unknown';
          sendCaseAssignedAlert(
            { fullName: peer.fullName, email: peer.email },
            { id: c.id, specialtyRequired: c.specialtyRequired, dueDate: c.dueDate },
            providerName
          ).catch(() => {});
        }
      }

      // Update projected completion for this batch
      const batchCases = await db
        .select({ due_date: reviewCases.dueDate, status: reviewCases.status })
        .from(reviewCases)
        .where(eq(reviewCases.batchId, batch_id));

      if (batchCases.length > 0) {
        const projected = calculateProjectedCompletion(
          batchCases.map((c) => ({
            due_date: c.due_date ? new Date(c.due_date).toISOString() : null,
            status: c.status as string,
          }))
        );
        if (projected) {
          await db
            .update(batches)
            .set({ projectedCompletion: projected })
            .where(eq(batches.id, batch_id));
        }
      }

      await auditLog({
        action: 'batch_assignments_approved',
        resourceType: 'batch',
        resourceId: batch_id,
        metadata: { approved_count: approved.length, skipped_count: skipped.length },
        request,
      });

      return NextResponse.json({
        success: true,
        approved_count: approved.length,
        approved,
        skipped,
      });
    }

    // Single case approval
    if (case_id) {
      await approveAssignment(case_id);

      // Fetch case details and send email
      const caseData = await db.query.reviewCases.findFirst({
        where: eq(reviewCases.id, case_id),
        columns: { id: true, batchId: true, specialtyRequired: true, dueDate: true },
        with: {
          peer: { columns: { fullName: true, email: true } },
          provider: { columns: { firstName: true, lastName: true } },
        },
      });

      // Recalculate projected completion for this case's batch
      if (caseData?.batchId) {
        const sibling = await db
          .select({ due_date: reviewCases.dueDate, status: reviewCases.status })
          .from(reviewCases)
          .where(eq(reviewCases.batchId, caseData.batchId));

        if (sibling.length > 0) {
          const projected = calculateProjectedCompletion(
            sibling.map((c) => ({
              due_date: c.due_date ? new Date(c.due_date).toISOString() : null,
              status: c.status as string,
            }))
          );
          if (projected) {
            await db
              .update(batches)
              .set({ projectedCompletion: projected })
              .where(eq(batches.id, caseData.batchId));
          }
        }
      }

      if (caseData) {
        const peer = caseData.peer;
        if (peer?.email) {
          const providerName = caseData.provider
            ? `${caseData.provider.firstName ?? ''} ${caseData.provider.lastName ?? ''}`.trim() || 'Unknown'
            : 'Unknown';
          // Phase 5.4 SA-091 — never block the approval response on email send.
          sendCaseAssignedAlert(
            { fullName: peer.fullName, email: peer.email },
            { id: case_id, specialtyRequired: caseData.specialtyRequired, dueDate: caseData.dueDate },
            providerName
          ).catch(() => {});
        }
      }

      await auditLog({
        action: 'assignment_approved',
        resourceType: 'review_case',
        resourceId: case_id,
        request,
      });

      return NextResponse.json({ success: true, case_id });
    }

    return NextResponse.json(
      { error: 'Invalid request', code: 'VALIDATION_ERROR' },
      { status: 400 }
    );
  } catch (err) {
    console.error('[API] POST /api/assign/approve error:', err);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
