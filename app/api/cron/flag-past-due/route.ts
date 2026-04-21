import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { auditLog } from '@/lib/utils/audit';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Verify CRON_SECRET from Authorization header
    const authHeader = request.headers.get('authorization');
    const expectedSecret = process.env.CRON_SECRET;

    if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const now = new Date().toISOString();

    // Find cases that are past due
    const { data: pastDueCases, error: fetchError } = await supabaseAdmin
      .from('review_cases')
      .select('id')
      .in('status', ['assigned', 'in_progress'])
      .lt('due_date', now)
      .not('due_date', 'is', null);

    if (fetchError) {
      return NextResponse.json(
        { error: fetchError.message, code: 'QUERY_FAILED' },
        { status: 500 }
      );
    }

    const caseIds = pastDueCases?.map((c: any) => c.id) || [];

    if (caseIds.length > 0) {
      const { error: updateError } = await supabaseAdmin
        .from('review_cases')
        .update({
          status: 'past_due',
          updated_at: new Date().toISOString(),
        })
        .in('id', caseIds);

      if (updateError) {
        return NextResponse.json(
          { error: updateError.message, code: 'UPDATE_FAILED' },
          { status: 500 }
        );
      }
    }

    await auditLog({
      action: 'cron_flag_past_due',
      resourceType: 'review_case',
      metadata: { flagged_count: caseIds.length, case_ids: caseIds },
    });

    // Auto-return reviewers whose unavailable_until has passed
    const today = new Date().toISOString().split('T')[0];
    const { data: expiredReviewers } = await supabaseAdmin
      .from('reviewers')
      .select('id, full_name')
      .neq('availability_status', 'available')
      .lte('unavailable_until', today)
      .not('unavailable_until', 'is', null);

    const returnedIds: string[] = [];
    if (expiredReviewers && expiredReviewers.length > 0) {
      for (const reviewer of expiredReviewers) {
        await supabaseAdmin
          .from('reviewers')
          .update({
            availability_status: 'available',
            unavailable_from: null,
            unavailable_until: null,
            unavailable_reason: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', reviewer.id);

        await supabaseAdmin.from('notifications').insert({
          user_id: null,
          type: 'reviewer_returned',
          title: `${reviewer.full_name} is now available`,
          body: `Reviewer ${reviewer.full_name} has been automatically marked as available (leave period ended).`,
          entity_type: 'reviewer',
          entity_id: reviewer.id,
        });

        returnedIds.push(reviewer.id);
      }
    }

    return NextResponse.json({ flagged: caseIds.length, reviewers_returned: returnedIds.length });
  } catch (err) {
    console.error('[API] GET /api/cron/flag-past-due error:', err);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
