import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/supabase/server';

// GET /api/company-forms?company_id=...&specialty=...
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get('company_id');
  const specialty = searchParams.get('specialty');

  if (!companyId) {
    return NextResponse.json({ error: 'company_id required' }, { status: 400 });
  }

  try {
    const forms = await query<{ id: string; form_name: string; specialty: string | null }>(
      `SELECT id, form_name, specialty
       FROM company_forms
       WHERE company_id = $1
         AND is_active = true
         AND ($2::text IS NULL OR specialty = $2)
       ORDER BY specialty ASC, form_name ASC`,
      [companyId, specialty]
    );
    return NextResponse.json({ forms });
  } catch (err) {
    console.error('[api/company-forms]', err);
    return NextResponse.json({ forms: [] });
  }
}
