import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { auditLog } from '@/lib/utils/audit';

// PATCH — Set reviewer as unavailable
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { availability_status, unavailable_from, unavailable_until, unavailable_reason } = body;

    const { error } = await supabaseAdmin
      .from('reviewers')
      .update({
        availability_status,
        unavailable_from,
        unavailable_until,
        unavailable_reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await auditLog({
      action: 'reviewer_set_unavailable',
      resourceType: 'reviewer',
      resourceId: id,
      metadata: { availability_status, unavailable_from, unavailable_until, unavailable_reason },
      request,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[API] PATCH /api/reviewers/[id]/availability error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST — Mark reviewer as available (reset all fields)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const { error } = await supabaseAdmin
      .from('reviewers')
      .update({
        availability_status: 'available',
        unavailable_from: null,
        unavailable_until: null,
        unavailable_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await auditLog({
      action: 'reviewer_marked_available',
      resourceType: 'reviewer',
      resourceId: id,
      request,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[API] POST /api/reviewers/[id]/availability error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
