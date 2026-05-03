import { NextRequest, NextResponse } from 'next/server';
import { db, toSnake } from '@/lib/db';
import { companyForms, reviewCases, reviewResults } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

// GET /api/company-forms/[id] — fetch full form incl form_fields (for cloning)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const [row] = await db
      .select({
        id: companyForms.id,
        companyId: companyForms.companyId,
        specialty: companyForms.specialty,
        formName: companyForms.formName,
        formFields: companyForms.formFields,
        isActive: companyForms.isActive,
        allowAiGeneratedRecommendations: companyForms.allowAiGeneratedRecommendations,
        scoringSystem: companyForms.scoringSystem,
        passFailThreshold: companyForms.passFailThreshold,
      })
      .from(companyForms)
      .where(eq(companyForms.id, id))
      .limit(1);

    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ form: toSnake(row) });
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
    if (
      body.scoring_system === 'yes_no_na' ||
      body.scoring_system === 'abc_na' ||
      body.scoring_system === 'pass_fail'
    ) {
      updates.scoringSystem = body.scoring_system;
    }
    if (body.pass_fail_threshold === null || typeof body.pass_fail_threshold === 'object') {
      updates.passFailThreshold = body.pass_fail_threshold;
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

// DELETE /api/company-forms/[id] — Phase 6.1
// Blocked if any submitted reviews reference this form. The link runs through
// review_cases.companyFormId → review_results.caseId.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const used = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(reviewResults)
      .innerJoin(reviewCases, eq(reviewCases.id, reviewResults.caseId))
      .where(eq(reviewCases.companyFormId, id));
    const usageCount = used[0]?.n ?? 0;
    if (usageCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete: ${usageCount} completed review(s) reference this form. Disable it instead.`,
          code: 'IN_USE',
          usage_count: usageCount,
        },
        { status: 409 }
      );
    }
    const [row] = await db.delete(companyForms).where(eq(companyForms.id, id)).returning();
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[api/company-forms/[id] DELETE]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
