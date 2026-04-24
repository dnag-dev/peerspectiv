import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { status, notes } = body as {
      status?: 'pending' | 'approved' | 'paid';
      notes?: string;
    };

    if (!status || !['pending', 'approved', 'paid'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const update: Record<string, unknown> = { status };
    if (status === 'approved') update.approved_at = new Date().toISOString();
    if (status === 'paid') update.paid_at = new Date().toISOString();
    if (notes != null) update.notes = notes;

    const { data, error } = await supabaseAdmin
      .from('reviewer_payouts')
      .update(update)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      console.error('[payouts] patch error:', error);
      return NextResponse.json({ error: 'DB_ERROR' }, { status: 500 });
    }
    return NextResponse.json({ data });
  } catch (err) {
    console.error('[API] PATCH /api/payouts/[id] error:', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
