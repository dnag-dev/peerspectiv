import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
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
      form_fields,
      template_pdf_url,
      template_pdf_name,
      allow_ai_generated_recommendations,
    } = body as {
      company_id: string;
      specialty: string;
      form_name: string;
      form_fields: FormFieldInput[];
      template_pdf_url?: string;
      template_pdf_name?: string;
      allow_ai_generated_recommendations?: boolean;
    };

    if (!company_id || !specialty || !form_name || !Array.isArray(form_fields) || form_fields.length === 0) {
      return NextResponse.json(
        { error: 'company_id, specialty, form_name, and at least one form field are required' },
        { status: 400 }
      );
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
      return out;
    });

    const { data, error } = await supabaseAdmin
      .from('company_forms')
      .insert({
        company_id,
        specialty,
        form_name,
        form_fields: normalizedFields,
        is_active: true,
        template_pdf_url: template_pdf_url || null,
        template_pdf_name: template_pdf_name || null,
        allow_ai_generated_recommendations: !!allow_ai_generated_recommendations,
      })
      .select('id, company_id, specialty, form_name, is_active')
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || 'Insert failed' },
        { status: 500 }
      );
    }

    await auditLog({
      action: 'company_form_created',
      resourceType: 'company_form',
      resourceId: data.id,
      metadata: { company_id, specialty, form_name, field_count: normalizedFields.length },
      request,
    });

    return NextResponse.json({ form: data }, { status: 201 });
  } catch (err) {
    console.error('[api/company-forms/create]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
