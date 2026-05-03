import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { batches, reviewCases } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { auditLog } from '@/lib/utils/audit';

// PATCH /api/batches/[id]
// Body: { company_form_id?: string }
// When company_form_id is swapped, cascade to all review_cases in the batch
// so the reviewer always sees the currently-attached form.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { company_form_id } = body as { company_form_id?: string };

    if (!company_form_id) {
      return NextResponse.json(
        { error: 'company_form_id is required' },
        { status: 400 }
      );
    }

    // Update the batch
    await db
      .update(batches)
      .set({ companyFormId: company_form_id })
      .where(eq(batches.id, id));

    // Cascade to all cases in this batch
    await db
      .update(reviewCases)
      .set({ companyFormId: company_form_id, updatedAt: new Date() })
      .where(eq(reviewCases.batchId, id));

    await auditLog({
      action: 'batch_form_changed',
      resourceType: 'batch',
      resourceId: id,
      metadata: { company_form_id },
      request,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[api/batches/[id] PATCH]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
