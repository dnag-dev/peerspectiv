import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { auditLog } from '@/lib/utils/audit';

interface CaseInput {
  provider_id: string;
  specialty_required: string;
  encounter_date?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { batch_name, company_id, cases } = body as {
      batch_name: string;
      company_id: string;
      cases: CaseInput[];
    };

    if (!batch_name || !company_id || !Array.isArray(cases) || cases.length === 0) {
      return NextResponse.json(
        { error: 'batch_name, company_id, and a non-empty cases array are required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // Create the batch record
    const { data: batch, error: batchError } = await supabaseAdmin
      .from('batches')
      .insert({
        batch_name,
        company_id,
        date_uploaded: new Date().toISOString(),
        total_cases: cases.length,
        assigned_cases: 0,
        completed_cases: 0,
        status: 'pending',
      })
      .select()
      .single();

    if (batchError || !batch) {
      return NextResponse.json(
        { error: batchError?.message || 'Failed to create batch', code: 'BATCH_CREATE_FAILED' },
        { status: 500 }
      );
    }

    // Create review_cases records for each case
    const caseRecords = cases.map((c) => ({
      batch_id: batch.id,
      provider_id: c.provider_id,
      company_id,
      specialty_required: c.specialty_required,
      encounter_date: c.encounter_date || null,
      status: 'unassigned' as const,
      ai_analysis_status: 'pending' as const,
      priority: 'normal' as const,
    }));

    const { error: casesError } = await supabaseAdmin
      .from('review_cases')
      .insert(caseRecords);

    if (casesError) {
      // Clean up the batch if case creation fails
      await supabaseAdmin.from('batches').delete().eq('id', batch.id);
      return NextResponse.json(
        { error: casesError.message, code: 'CASES_CREATE_FAILED' },
        { status: 500 }
      );
    }

    // Update batch total_cases count (defensive, in case of trigger differences)
    await supabaseAdmin
      .from('batches')
      .update({ total_cases: cases.length })
      .eq('id', batch.id);

    await auditLog({
      action: 'batch_created',
      resourceType: 'batch',
      resourceId: batch.id,
      metadata: { batch_name, company_id, case_count: cases.length },
      request,
    });

    return NextResponse.json({ data: batch }, { status: 201 });
  } catch (err) {
    console.error('[API] POST /api/batches error:', err);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
