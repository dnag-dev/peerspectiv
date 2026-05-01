import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { uploadChart } from '@/lib/storage';
import { analyzeChart } from '@/lib/ai/chart-analyzer';
import { auditLog } from '@/lib/utils/audit';
import { db } from '@/lib/db';
import { retentionSchedule } from '@/lib/db/schema';
import { extractChartMetadata } from '@/lib/pdf/extractor';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const caseId = formData.get('case_id') as string | null;

    if (!file || !caseId) {
      return NextResponse.json(
        { error: 'file and case_id are required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Only PDF files are accepted', code: 'INVALID_FILE_TYPE' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds 50MB limit', code: 'FILE_TOO_LARGE' },
        { status: 400 }
      );
    }

    // Verify case exists
    const { data: caseData, error: caseError } = await supabaseAdmin
      .from('review_cases')
      .select('id, encounter_date')
      .eq('id', caseId)
      .single();

    if (caseError || !caseData) {
      return NextResponse.json(
        { error: 'Case not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Upload to Vercel Blob
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const buffer = Buffer.from(await file.arrayBuffer());
    let blobUrl: string;
    try {
      blobUrl = await uploadChart(buffer, caseId, sanitizedName);
    } catch (uploadError) {
      return NextResponse.json(
        { error: uploadError instanceof Error ? uploadError.message : 'Upload failed', code: 'UPLOAD_FAILED' },
        { status: 500 }
      );
    }

    // D1: extract patient/provider/encounter metadata from the PDF
    let metadata: Awaited<ReturnType<typeof extractChartMetadata>> | null = null;
    try {
      metadata = await extractChartMetadata(buffer);
    } catch (metaErr) {
      console.warn('[API] chart metadata extraction failed for case:', caseId, metaErr);
    }

    // Build the case update — only fill fields we have.
    const caseUpdate: Record<string, unknown> = {
      chart_file_path: blobUrl,
      chart_file_name: file.name,
      updated_at: new Date().toISOString(),
    };
    if (metadata) {
      if (metadata.patient_first) caseUpdate.patient_first_name = metadata.patient_first;
      if (metadata.patient_last) caseUpdate.patient_last_name = metadata.patient_last;
      if (metadata.mrn) caseUpdate.mrn_number = metadata.mrn;
      if (typeof metadata.is_pediatric === 'boolean') caseUpdate.is_pediatric = metadata.is_pediatric;
      // Only set encounter_date if not already present
      if (metadata.encounter_date && !caseData.encounter_date) {
        caseUpdate.encounter_date = metadata.encounter_date;
      }
    }

    // Update review_cases with chart info (store blob URL instead of path)
    await supabaseAdmin
      .from('review_cases')
      .update(caseUpdate)
      .eq('id', caseId);

    // Audit log -- case_id only, no filename (PHI protection)
    await auditLog({
      action: 'chart_uploaded',
      resourceType: 'review_case',
      resourceId: caseId,
      metadata: { file_size_bytes: file.size },
      request,
    });

    // Retention hook -- schedule deletion 30 days out.
    try {
      const deleteAfter = new Date();
      deleteAfter.setDate(deleteAfter.getDate() + 30);
      await db.insert(retentionSchedule).values({
        entityType: 'chart_file',
        entityId: caseId,
        storagePath: blobUrl,
        deleteAfter,
      });
    } catch (retentionErr) {
      console.error('[API] retention schedule insert failed for case:', caseId, retentionErr);
    }

    // Trigger AI analysis in the background
    analyzeChart(caseId).catch((err) => {
      console.error('[API] Background analysis after upload failed for case:', caseId, err);
    });

    return NextResponse.json(
      { success: true, path: blobUrl, metadata: metadata ?? null },
      { status: 201 }
    );
  } catch (err) {
    console.error('[API] POST /api/upload/chart error:', err);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
