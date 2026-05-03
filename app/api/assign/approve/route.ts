import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { reviewCases, batches } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { approveAssignment, approveAllAssignments } from '@/lib/ai/assignment-engine';
import { sendPeerAssignment } from '@/lib/email/notifications';
import { auditLog } from '@/lib/utils/audit';
import { calculateProjectedCompletion } from '@/lib/utils/completion';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { case_id, batch_id, approve_all, reassign_to, company_form_id } = body as {
      case_id?: string;
      batch_id?: string;
      approve_all?: boolean;
      reassign_to?: string;
      company_form_id?: string;
    };

    if (!case_id && !(batch_id && approve_all)) {
      return NextResponse.json(
        { error: 'Provide case_id for single approval, or batch_id with approve_all: true', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // Optional reassign: swap reviewer_id before approval. Used by manual peer picker.
    if (case_id && reassign_to) {
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
      const count = await approveAllAssignments(batch_id);

      // Send emails to all newly assigned peers in the batch
      const assignedCases = await db.query.reviewCases.findMany({
        where: and(eq(reviewCases.batchId, batch_id), eq(reviewCases.status, 'assigned')),
        columns: { id: true, specialtyRequired: true, dueDate: true },
        with: { peer: { columns: { fullName: true, email: true } } },
      });

      for (const c of assignedCases) {
        const peer = c.peer;
        if (peer?.email) {
          sendPeerAssignment({
            peerEmail: peer.email,
            peerName: peer.fullName ?? '',
            caseId: c.id,
            specialty: c.specialtyRequired || 'General',
            dueDate: c.dueDate ? new Date(c.dueDate).toLocaleDateString() : 'TBD',
            portalUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.peerspectiv.com'}/peer/case/${c.id}`,
          }).catch(() => {});
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
        metadata: { approved_count: count },
        request,
      });

      return NextResponse.json({ success: true, approved_count: count });
    }

    // Single case approval
    if (case_id) {
      await approveAssignment(case_id);

      // Fetch case details and send email
      const caseData = await db.query.reviewCases.findFirst({
        where: eq(reviewCases.id, case_id),
        columns: { id: true, batchId: true, specialtyRequired: true, dueDate: true },
        with: { peer: { columns: { fullName: true, email: true } } },
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
          sendPeerAssignment({
            peerEmail: peer.email,
            peerName: peer.fullName ?? '',
            caseId: case_id,
            specialty: caseData.specialtyRequired || 'General',
            dueDate: caseData.dueDate ? new Date(caseData.dueDate).toLocaleDateString() : 'TBD',
            portalUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.peerspectiv.com'}/peer/case/${case_id}`,
          }).catch(() => {});
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
