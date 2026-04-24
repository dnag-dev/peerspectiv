import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { auditLog } from '@/lib/utils/audit';

// PATCH /api/batches/[id]
// Body: { company_form_id?: string }
// When company_form_id is swapped, cascade to all review_cases in the batch
// so the reviewer always sees the currently-attached form.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { company_form_id } = body as { company_form_id?: string };

    if (!company_form_id) {
      return NextResponse.json(
        { error: 'company_form_id is required' },
        { status: 400 }
      );
    }

    // Update the batch
    const { error: batchErr } = await supabaseAdmin
      .from('batches')
      .update({ company_form_id })
      .eq('id', id);
    if (batchErr) {
      return NextResponse.json({ error: batchErr.message }, { status: 500 });
    }

    // Cascade to all cases in this batch
    const { error: casesErr } = await supabaseAdmin
      .from('review_cases')
      .update({ company_form_id, updated_at: new Date().toISOString() })
      .eq('batch_id', id);
    if (casesErr) {
      return NextResponse.json({ error: casesErr.message }, { status: 500 });
    }

    await auditLog({
      action: 'batch_form_changed',
      resourceType: 'batch',
      resourceId: id,
      metadata: { company_form_id },
      request,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[api/batches/[id] PATCH]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
