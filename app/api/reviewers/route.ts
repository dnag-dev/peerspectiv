import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      full_name,
      email,
      specialty,
      board_certification,
      rate_type,
      rate_amount,
    } = body as {
      full_name?: string;
      email?: string;
      specialty?: string;
      board_certification?: string;
      rate_type?: 'per_minute' | 'per_report' | 'per_hour';
      rate_amount?: number | string;
    };

    if (!full_name || !email || !specialty) {
      return NextResponse.json(
        { error: 'full_name, email, and specialty are required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const rt = rate_type ?? 'per_minute';
    if (!['per_minute', 'per_report', 'per_hour'].includes(rt)) {
      return NextResponse.json(
        { error: 'Invalid rate_type', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const ra = rate_amount != null ? Number(rate_amount) : 1.0;
    if (!Number.isFinite(ra) || ra < 0) {
      return NextResponse.json(
        { error: 'Invalid rate_amount', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('reviewers')
      .insert({
        full_name,
        email,
        specialty,
        board_certification: board_certification ?? null,
        status: 'active',
        availability_status: 'available',
        active_cases_count: 0,
        total_reviews_completed: 0,
        rate_type: rt,
        rate_amount: ra,
      })
      .select()
      .single();

    if (error) {
      console.error('[API] POST /api/reviewers error:', error);
      return NextResponse.json(
        { error: 'Failed to create reviewer', code: 'DB_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error('[API] POST /api/reviewers error:', err);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
