import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { companies, companyForms } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { auditLog } from '@/lib/utils/audit';

interface FormFieldInput {
  field_key: string;
  field_label: string;
  field_type: 'yes_no' | 'rating' | 'text';
  is_required?: boolean;
  display_order?: number;
  // Section C additions
  allow_na?: boolean;
  default_value?: 'yes' | 'no' | 'na' | null;
  required_text_on_non_default?: boolean;
  ops_term?: string | null;
  // Phase 6.1 — per-question scoring metadata
  default_answer?: 'yes' | 'no' | 'A' | 'B' | 'C' | null;
  is_critical?: boolean;
}

// POST /api/company-forms/create
// Body: { company_id, specialty, form_name, form_fields: FormFieldInput[] }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      company_id,
      specialty,
      form_name,
      form_identifier,
      form_fields,
      template_pdf_url,
      template_pdf_name,
      allow_ai_generated_recommendations,
      scoring_system,
      pass_fail_threshold,
    } = body as {
      company_id: string;
      specialty: string;
      form_name?: string;
      form_identifier?: string;
      form_fields: FormFieldInput[];
      template_pdf_url?: string;
      template_pdf_name?: string;
      allow_ai_generated_recommendations?: boolean;
      scoring_system?: 'yes_no_na' | 'abc_na' | 'pass_fail';
      pass_fail_threshold?: unknown;
    };

    const identifier = (form_identifier || '').trim();
    if (!company_id || !specialty || !Array.isArray(form_fields) || form_fields.length === 0) {
      return NextResponse.json(
        { error: 'company_id, specialty, and at least one form field are required' },
        { status: 400 }
      );
    }
    if (!identifier && !form_name) {
      return NextResponse.json(
        { error: 'form_identifier is required' },
        { status: 400 }
      );
    }

    // Look up company name to build the display form_name
    let computedFormName: string;
    if (identifier) {
      const [company] = await db.select({ name: companies.name }).from(companies).where(eq(companies.id, company_id)).limit(1);
      const companyName = company?.name || 'Unknown';
      computedFormName = `${companyName} - ${specialty} - ${identifier}`;
    } else {
      // Backward compat: if form_name passed directly (legacy callers)
      computedFormName = form_name!;
    }

    // Normalize fields — ensure unique, stable field_keys and ordering
    const seen = new Set<string>();
    const normalizedFields = form_fields.map((f, idx) => {
      let key = (f.field_key || f.field_label || `field_${idx}`)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '');
      if (!key) key = `field_${idx}`;
      let uniqueKey = key;
      let suffix = 1;
      while (seen.has(uniqueKey)) {
        uniqueKey = `${key}_${suffix++}`;
      }
      seen.add(uniqueKey);
      const fieldType = ['yes_no', 'rating', 'text'].includes(f.field_type) ? f.field_type : 'text';
      const out: Record<string, unknown> = {
        field_key: uniqueKey,
        field_label: f.field_label,
        field_type: fieldType,
        is_required: !!f.is_required,
        display_order: f.display_order ?? idx,
      };
      // Section C metadata — only persisted when meaningful, never on non-yes_no
      if (fieldType === 'yes_no') {
        if (f.allow_na) out.allow_na = true;
        const dv = f.default_value;
        if (dv === 'yes' || dv === 'no' || (dv === 'na' && f.allow_na)) {
          out.default_value = dv;
        }
        if (f.required_text_on_non_default) out.required_text_on_non_default = true;
      }
      if (f.ops_term) out.ops_term = f.ops_term;
      // Phase 6.1 — per-question default_answer (depends on scoring_system) and
      // is_critical (only meaningful for pass_fail scoring).
      const da = f.default_answer;
      if (da === 'yes' || da === 'no' || da === 'A' || da === 'B' || da === 'C') {
        out.default_answer = da;
      }
      if (f.is_critical) out.is_critical = true;
      return out;
    });

    const scoring: 'yes_no_na' | 'abc_na' | 'pass_fail' =
      scoring_system === 'abc_na' || scoring_system === 'pass_fail'
        ? scoring_system
        : 'yes_no_na';
    const passFail =
      scoring === 'pass_fail' && pass_fail_threshold && typeof pass_fail_threshold === 'object'
        ? pass_fail_threshold
        : null;

    let row;
    try {
      [row] = await db
        .insert(companyForms)
        .values({
          companyId: company_id,
          specialty,
          formName: computedFormName,
          formIdentifier: identifier || null,
          formFields: normalizedFields,
          isActive: true,
          templatePdfUrl: template_pdf_url || null,
          templatePdfName: template_pdf_name || null,
          allowAiGeneratedRecommendations: !!allow_ai_generated_recommendations,
          scoringSystem: scoring,
          passFailThreshold: passFail as any,
        })
        .returning({
          id: companyForms.id,
          company_id: companyForms.companyId,
          specialty: companyForms.specialty,
          form_name: companyForms.formName,
          form_identifier: companyForms.formIdentifier,
          is_active: companyForms.isActive,
        });
    } catch (err: any) {
      return NextResponse.json(
        { error: err?.message || 'Insert failed' },
        { status: 500 }
      );
    }

    await auditLog({
      action: 'company_form_created',
      resourceType: 'company_form',
      resourceId: row.id,
      metadata: { company_id, specialty, form_name, field_count: normalizedFields.length },
      request,
    });

    return NextResponse.json({ form: row }, { status: 201 });
  } catch (err) {
    console.error('[api/company-forms/create]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
