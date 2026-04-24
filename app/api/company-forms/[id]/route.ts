import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/supabase/server';

// GET /api/company-forms/[id] — fetch full form incl form_fields (for cloning)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const rows = await query<{
      id: string;
      company_id: string;
      specialty: string;
      form_name: string;
      form_fields: unknown;
      is_active: boolean;
    }>(
      `SELECT id, company_id, specialty, form_name, form_fields, is_active
       FROM company_forms WHERE id = $1 LIMIT 1`,
      [id]
    );
    if (!rows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ form: rows[0] });
  } catch (err) {
    console.error('[api/company-forms/[id]]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
