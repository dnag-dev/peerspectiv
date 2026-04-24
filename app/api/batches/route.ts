import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { auditLog } from '@/lib/utils/audit';
import { db } from '@/lib/db';
import { notifications } from '@/lib/db/schema';

interface CaseInput {
  provider_id: string | null;
  specialty_required?: string | null;
  encounter_date?: string | null;
  chart_file_name?: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      batch_name,
      company_id,
      specialty,
      company_form_id,
      cases,
      status,
      submitted_by,
    } = body as {
      batch_name: string;
      company_id: string;
      specialty?: string;
      company_form_id?: string;
      cases: CaseInput[];
      status?: string;
      submitted_by?: string;
    };

    if (!batch_name || !company_id || !Array.isArray(cases) || cases.length === 0) {
      return NextResponse.json(
        { error: 'batch_name, company_id, and a non-empty cases array are required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const batchStatus = status || 'pending';

    // Create the batch record
    const { data: batch, error: batchError } = await supabaseAdmin
      .from('batches')
      .insert({
        batch_name,
        company_id,
        specialty: specialty ?? null,
        company_form_id: company_form_id ?? null,
        date_uploaded: new Date().toISOString(),
        total_cases: cases.length,
        assigned_cases: 0,
        completed_cases: 0,
        status: batchStatus,
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
      provider_id: c.provider_id ?? null,
      company_id,
      specialty_required: c.specialty_required ?? specialty ?? null,
      encounter_date: c.encounter_date || null,
      chart_file_name: c.chart_file_name || null,
      company_form_id: company_form_id ?? null,
      status: 'unassigned' as const,
      ai_analysis_status: 'pending' as const,
      priority: 'normal' as const,
    }));

    const { data: insertedCases, error: casesError } = await supabaseAdmin
      .from('review_cases')
      .insert(caseRecords)
      .select('id, chart_file_name, provider_id');

    if (casesError) {
      // Clean up the batch if case creation fails
      await supabaseAdmin.from('batches').delete().eq('id', batch.id);
      return NextResponse.json(
        { error: casesError.message, code: 'CASES_CREATE_FAILED' },
        { status: 500 }
      );
    }

    // Refresh total count (defensive)
    await supabaseAdmin
      .from('batches')
      .update({ total_cases: cases.length })
      .eq('id', batch.id);

    // Fire an admin notification if this is a client-submitted batch
    if (batchStatus === 'pending_admin_review') {
      try {
        await db.insert(notifications).values({
          userId: null, // global / admin
          type: 'batch_pending_review',
          title: 'New batch submitted for review',
          body: `${submitted_by || 'Client'} submitted "${batch_name}" (${cases.length} cases, ${specialty || 'mixed'}) — awaiting admin activation.`,
          entityType: 'batch',
          entityId: batch.id,
        });
      } catch (nerr) {
        console.warn('[API] notification insert failed:', nerr);
      }
    }

    await auditLog({
      action: 'batch_created',
      resourceType: 'batch',
      resourceId: batch.id,
      metadata: {
        batch_name,
        company_id,
        specialty: specialty ?? null,
        case_count: cases.length,
        status: batchStatus,
      },
      request,
    });

    return NextResponse.json(
      { data: batch, cases: insertedCases ?? [] },
      { status: 201 }
    );
  } catch (err) {
    console.error('[API] POST /api/batches error:', err);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
