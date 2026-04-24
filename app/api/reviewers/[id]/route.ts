import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const {
      rate_type,
      rate_amount,
      full_name,
      email,
      specialty,
      board_certification,
      status,
    } = body as {
      rate_type?: 'per_minute' | 'per_report' | 'per_hour';
      rate_amount?: number | string;
      full_name?: string;
      email?: string;
      specialty?: string;
      board_certification?: string | null;
      status?: string;
    };

    const update: Record<string, unknown> = {};

    if (full_name != null) {
      const v = full_name.trim();
      if (!v) {
        return NextResponse.json(
          { error: 'full_name cannot be empty', code: 'VALIDATION_ERROR' },
          { status: 400 }
        );
      }
      update.full_name = v;
    }

    if (email != null) {
      const v = email.trim();
      if (!v || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
        return NextResponse.json(
          { error: 'Invalid email', code: 'VALIDATION_ERROR' },
          { status: 400 }
        );
      }
      update.email = v;
    }

    if (specialty != null) {
      const v = specialty.trim();
      if (!v) {
        return NextResponse.json(
          { error: 'specialty cannot be empty', code: 'VALIDATION_ERROR' },
          { status: 400 }
        );
      }
      update.specialty = v;
    }

    if (board_certification !== undefined) {
      const v = typeof board_certification === 'string' ? board_certification.trim() : '';
      update.board_certification = v || null;
    }

    if (status != null) {
      if (!['active', 'inactive'].includes(status)) {
        return NextResponse.json(
          { error: 'Invalid status', code: 'VALIDATION_ERROR' },
          { status: 400 }
        );
      }
      update.status = status;
    }

    if (rate_type != null) {
      if (!['per_minute', 'per_report', 'per_hour'].includes(rate_type)) {
        return NextResponse.json(
          { error: 'Invalid rate_type', code: 'VALIDATION_ERROR' },
          { status: 400 }
        );
      }
      update.rate_type = rate_type;
    }

    if (rate_amount != null) {
      const ra = Number(rate_amount);
      if (!Number.isFinite(ra) || ra < 0) {
        return NextResponse.json(
          { error: 'Invalid rate_amount', code: 'VALIDATION_ERROR' },
          { status: 400 }
        );
      }
      update.rate_amount = ra;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('reviewers')
      .update(update)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      console.error('[API] PATCH /api/reviewers/[id] error:', error);
      return NextResponse.json(
        { error: 'Failed to update reviewer', code: 'DB_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error('[API] PATCH /api/reviewers/[id] error:', err);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
