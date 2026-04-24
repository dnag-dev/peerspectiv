import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { approveAssignment, approveAllAssignments } from '@/lib/ai/assignment-engine';
import { sendReviewerAssignment } from '@/lib/email/notifications';
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

    // Optional reassign: swap reviewer_id before approval. Used by manual reviewer picker.
    if (case_id && reassign_to) {
      await supabaseAdmin
        .from('review_cases')
        .update({ reviewer_id: reassign_to, updated_at: new Date().toISOString() })
        .eq('id', case_id);
    }
    // Optional form override: record which company-approved form applies.
    if (case_id && company_form_id) {
      await supabaseAdmin
        .from('review_cases')
        .update({ company_form_id, updated_at: new Date().toISOString() })
        .eq('id', case_id);
    }

    if (approve_all && batch_id) {
      const count = await approveAllAssignments(batch_id);

      // Send emails to all newly assigned reviewers in the batch
      const { data: assignedCases } = await supabaseAdmin
        .from('review_cases')
        .select('id, specialty_required, due_date, reviewer:reviewers(full_name, email)')
        .eq('batch_id', batch_id)
        .eq('status', 'assigned');

      if (assignedCases) {
        for (const c of assignedCases) {
          const reviewer = c.reviewer as unknown as { full_name: string; email: string } | null;
          if (reviewer?.email) {
            sendReviewerAssignment({
              reviewerEmail: reviewer.email,
              reviewerName: reviewer.full_name,
              caseId: c.id,
              specialty: c.specialty_required || 'General',
              dueDate: c.due_date ? new Date(c.due_date).toLocaleDateString() : 'TBD',
              portalUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.peerspectiv.com'}/reviewer/case/${c.id}`,
            }).catch(() => {});
          }
        }
      }

      // Update projected completion for this batch
      const { data: batchCases } = await supabaseAdmin
        .from('review_cases')
        .select('due_date, status')
        .eq('batch_id', batch_id);

      if (batchCases) {
        const projected = calculateProjectedCompletion(batchCases);
        if (projected) {
          await supabaseAdmin
            .from('batches')
            .update({ projected_completion: projected.toISOString() })
            .eq('id', batch_id);
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
      const { data: caseData } = await supabaseAdmin
        .from('review_cases')
        .select('id, specialty_required, due_date, reviewer:reviewers(full_name, email)')
        .eq('id', case_id)
        .single();

      if (caseData) {
        const reviewer = caseData.reviewer as unknown as { full_name: string; email: string } | null;
        if (reviewer?.email) {
          sendReviewerAssignment({
            reviewerEmail: reviewer.email,
            reviewerName: reviewer.full_name,
            caseId: case_id,
            specialty: caseData.specialty_required || 'General',
            dueDate: caseData.due_date ? new Date(caseData.due_date).toLocaleDateString() : 'TBD',
            portalUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.peerspectiv.com'}/reviewer/case/${case_id}`,
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
