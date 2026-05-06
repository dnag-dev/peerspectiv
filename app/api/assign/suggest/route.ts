import { NextRequest, NextResponse } from 'next/server';
import { suggestAssignments } from '@/lib/ai/assignment-engine';
import { auditLog } from '@/lib/utils/audit';
import { db } from '@/lib/db';
import { batches } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireActiveCompany } from '@/lib/utils/company-guard';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { batch_id } = body as { batch_id: string };

    if (!batch_id) {
      return NextResponse.json(
        { error: 'batch_id is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // Company status guard
    const [batch] = await db.select({ companyId: batches.companyId }).from(batches).where(eq(batches.id, batch_id)).limit(1);
    if (batch?.companyId) {
      const active = await requireActiveCompany(batch.companyId);
      if (!active) {
        return NextResponse.json(
          { error: 'Company must be Active to suggest assignments.', code: 'COMPANY_NOT_ACTIVE' },
          { status: 403 }
        );
      }
    }

    const result = await suggestAssignments(batch_id);

    await auditLog({
      action: 'assignment_suggestions_generated',
      resourceType: 'batch',
      resourceId: batch_id,
      metadata: {
        assigned_count: result.assignments.length,
        unassignable_count: result.unassignable.length,
      },
      request,
    });

    return NextResponse.json({ data: result });
  } catch (err) {
    console.error('[API] POST /api/assign/suggest error:', err);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
