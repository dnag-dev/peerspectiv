import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { companyForms } from '@/lib/db/schema';
import { and, asc, eq, or, sql } from 'drizzle-orm';

// GET /api/company-forms?company_id=...&specialty=...
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get('company_id');
  const specialty = searchParams.get('specialty');

  if (!companyId) {
    return NextResponse.json({ error: 'company_id required' }, { status: 400 });
  }

  try {
    const conditions = [
      eq(companyForms.companyId, companyId),
      eq(companyForms.isActive, true),
    ];
    if (specialty) conditions.push(eq(companyForms.specialty, specialty));

    const rows = await db
      .select({
        id: companyForms.id,
        form_name: companyForms.formName,
        specialty: companyForms.specialty,
      })
      .from(companyForms)
      .where(and(...conditions))
      .orderBy(asc(companyForms.specialty), asc(companyForms.formName));

    return NextResponse.json({ forms: rows });
  } catch (err) {
    console.error('[api/company-forms]', err);
    return NextResponse.json({ forms: [] });
  }
}
