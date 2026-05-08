import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { batches, reviewCases } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { auditLog } from '@/lib/utils/audit';
import { syncBatchStatus } from '@/lib/batches/sync-status';

// PATCH /api/batches/[id]
// Body: { company_form_id?: string, specialty?: string }
// When company_form_id is swapped, cascade to all review_cases in the batch.
// When specialty is changed, update batch + cascade to all cases' specialty_required.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { company_form_id, specialty } = body as {
      company_form_id?: string;
      specialty?: string;
    };

    if (!company_form_id && !specialty) {
      return NextResponse.json(
        { error: 'company_form_id or specialty is required' },
        { status: 400 }
      );
    }

    const batchUpdate: Record<string, unknown> = {};
    const caseUpdate: Record<string, unknown> = { updatedAt: new Date() };
    const auditMeta: Record<string, unknown> = {};

    if (company_form_id) {
      batchUpdate.companyFormId = company_form_id;
      caseUpdate.companyFormId = company_form_id;
      auditMeta.company_form_id = company_form_id;
    }

    if (specialty) {
      batchUpdate.specialty = specialty;
      caseUpdate.specialtyRequired = specialty;
      auditMeta.specialty = specialty;
    }

    // Update the batch
    await db
      .update(batches)
      .set(batchUpdate)
      .where(eq(batches.id, id));

    // Cascade to all cases in this batch
    await db
      .update(reviewCases)
      .set(caseUpdate)
      .where(eq(reviewCases.batchId, id));

    await auditLog({
      action: specialty ? 'batch_updated' : 'batch_form_changed',
      resourceType: 'batch',
      resourceId: id,
      metadata: auditMeta,
      request,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[api/batches/[id] PATCH]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/batches/[id]/cases?case_id=...
// Handled here as a query-param variant because Next.js route params only give us batch id.
// For actual case deletion, see /api/cases/[id] DELETE below.
