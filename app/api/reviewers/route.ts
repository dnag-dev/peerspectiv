import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { sendCredentialingAlert } from '@/lib/email/notifications';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      full_name,
      email,
      specialty,
      specialties,
      board_certification,
      license_number,
      license_state,
      credential_valid_until,
      max_case_load,
      rate_type,
      rate_amount,
    } = body as {
      full_name?: string;
      email?: string;
      specialty?: string;
      specialties?: string[];
      board_certification?: string;
      license_number?: string | null;
      license_state?: string | null;
      credential_valid_until?: string | null;
      max_case_load?: number | string;
      rate_type?: 'per_minute' | 'per_report' | 'per_hour';
      rate_amount?: number | string;
    };

    // Resolve effective specialties array (multi) and back-compat scalar
    let specs: string[] = Array.isArray(specialties)
      ? specialties.map((s) => s.trim()).filter(Boolean)
      : [];
    if (specs.length === 0 && specialty) specs = [specialty];

    if (!full_name || !email || specs.length === 0) {
      return NextResponse.json(
        { error: 'full_name, email, and at least one specialty are required', code: 'VALIDATION_ERROR' },
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

    const mcl = max_case_load != null ? Math.max(1, Number(max_case_load) || 75) : 75;

    // No credential expiry → keep reviewer inactive until credentialing reviews.
    const initialStatus = credential_valid_until ? 'active' : 'inactive';

    const { data, error } = await supabaseAdmin
      .from('reviewers')
      .insert({
        full_name,
        email,
        specialty: specs[0],
        specialties: specs,
        board_certification: board_certification ?? null,
        license_number: license_number ?? null,
        license_state: license_state ?? null,
        credential_valid_until: credential_valid_until ?? null,
        max_case_load: mcl,
        status: initialStatus,
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

    // Fire-and-forget credentialing notification.
    void sendCredentialingAlert({
      reviewerId: data.id,
      reviewerName: data.full_name ?? full_name,
      email: data.email ?? email,
      specialties: specs,
    }).catch((err) => {
      console.error('[API] sendCredentialingAlert failed:', err);
    });

    return NextResponse.json({ data });
  } catch (err) {
    console.error('[API] POST /api/reviewers error:', err);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
