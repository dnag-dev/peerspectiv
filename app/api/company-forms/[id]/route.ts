import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { companyForms } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

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
      allow_ai_generated_recommendations: boolean | null;
    }>(
      `SELECT id, company_id, specialty, form_name, form_fields, is_active,
              allow_ai_generated_recommendations
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

// PATCH — toggle is_active or replace form_fields / form_name / specialty
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await req.json();
    const updates: Record<string, any> = {};
    if (typeof body.is_active === 'boolean') updates.isActive = body.is_active;
    if (typeof body.form_name === 'string') updates.formName = body.form_name;
    if (typeof body.specialty === 'string') updates.specialty = body.specialty;
    if (Array.isArray(body.form_fields)) updates.formFields = body.form_fields;
    if (typeof body.allow_ai_generated_recommendations === 'boolean') {
      updates.allowAiGeneratedRecommendations = body.allow_ai_generated_recommendations;
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }
    const [row] = await db
      .update(companyForms)
      .set(updates)
      .where(eq(companyForms.id, id))
      .returning();
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ form: row });
  } catch (err) {
    console.error('[api/company-forms/[id] PATCH]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
