import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { sendCredentialingAlert } from '@/lib/email/notifications';

export const dynamic = 'force-dynamic';

/**
 * Public reviewer onboarding intake. Inserts an inactive reviewer row and
 * fires the credentialing notification — no auth required.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      full_name,
      email,
      specialties,
      license_number,
      license_state,
      board_certification,
      npi,
      max_case_load,
      reference,
    } = body as {
      full_name?: string;
      email?: string;
      specialties?: string[];
      license_number?: string;
      license_state?: string;
      board_certification?: string | null;
      npi?: string | null;
      max_case_load?: number | string;
      reference?: string | null;
    };

    const specs = Array.isArray(specialties)
      ? specialties.map((s) => s.trim()).filter(Boolean)
      : [];

    if (!full_name || !email || specs.length === 0 || !license_number || !license_state) {
      return NextResponse.json(
        {
          error: 'full_name, email, specialties, license_number, and license_state are required',
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const mcl = max_case_load != null ? Math.max(1, Number(max_case_load) || 75) : 75;

    const { data, error } = await supabaseAdmin
      .from('reviewers')
      .insert({
        full_name,
        email,
        specialty: specs[0],
        specialties: specs,
        board_certification: board_certification ?? null,
        license_number,
        license_state,
        max_case_load: mcl,
        // No credential_valid_until → reviewer remains blocked from assignment
        // until credentialing fills it in.
        status: 'inactive',
        availability_status: 'available',
        active_cases_count: 0,
        total_reviews_completed: 0,
        rate_type: 'per_minute',
        rate_amount: 1.0,
      })
      .select()
      .single();

    if (error) {
      console.error('[API] POST /api/onboard/reviewer error:', error);
      return NextResponse.json(
        { error: 'Failed to submit application', code: 'DB_ERROR' },
        { status: 500 }
      );
    }

    const bodyHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color:#0F2044;">New Reviewer Application</h2>
        <p><strong>${full_name}</strong> (${email}) submitted the public onboarding form.</p>
        <ul>
          <li>Specialties: ${specs.join(', ')}</li>
          <li>License: ${license_number} (${license_state})</li>
          <li>Board certification: ${board_certification || '—'}</li>
          <li>NPI: ${npi || '—'}</li>
          <li>Max case load preference: ${mcl}</li>
          <li>Reference: ${reference || '—'}</li>
        </ul>
        <p>Open credentialing to review and activate.</p>
      </div>
    `;

    void sendCredentialingAlert({
      reviewerId: data.id,
      reviewerName: full_name,
      email,
      specialties: specs,
      subject: `New reviewer application: ${full_name}`,
      bodyHtml,
    }).catch((err) => {
      console.error('[API] sendCredentialingAlert (onboard) failed:', err);
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[API] POST /api/onboard/reviewer error:', err);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
