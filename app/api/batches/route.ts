import { NextRequest, NextResponse } from 'next/server';
import { db, toSnake } from '@/lib/db';
import { batches, reviewCases, notifications } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { auditLog } from '@/lib/utils/audit';

interface CaseInput {
  provider_id: string | null;
  specialty_required?: string | null;
  encounter_date?: string | null;
  chart_file_name?: string | null;
  company_form_id?: string | null;
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

    // D6: detect multi-specialty batch and split into one child batch per specialty.
    const caseSpecialties = cases.map(
      (c) => c.specialty_required ?? specialty ?? null
    );
    const distinctSpecialties = Array.from(
      new Set(caseSpecialties.filter((s): s is string => !!s))
    );
    const isMixed =
      specialty === 'Mixed' ||
      (distinctSpecialties.length > 1 &&
        cases.some((c) => (c.specialty_required ?? specialty) !== distinctSpecialties[0]));

    if (isMixed && distinctSpecialties.length > 1) {
      const createdBatches: Array<{ id: string }> = [];
      const allInsertedCases: Array<{ id: string; chart_file_name: string | null; provider_id: string | null; specialty_required: string | null; batch_id: string | null }> = [];

      // Optional parent label batch — purely a marker, no cases attached.
      const [parentBatch] = await db
        .insert(batches)
        .values({
          batchName: `${batch_name} (mixed)`,
          companyId: company_id,
          specialty: null,
          companyFormId: null,
          dateUploaded: new Date(),
          totalCases: 0,
          assignedCases: 0,
          completedCases: 0,
          status: batchStatus,
        })
        .returning();

      for (const spec of distinctSpecialties) {
        const childCases = cases.filter(
          (c) => (c.specialty_required ?? specialty) === spec
        );
        if (childCases.length === 0) continue;

        let childBatch;
        try {
          [childBatch] = await db
            .insert(batches)
            .values({
              batchName: `${batch_name} — ${spec}`,
              companyId: company_id,
              specialty: spec,
              companyFormId: null,
              dateUploaded: new Date(),
              totalCases: childCases.length,
              assignedCases: 0,
              completedCases: 0,
              status: batchStatus,
            })
            .returning();
        } catch (err: any) {
          // Best-effort cleanup
          for (const b of createdBatches) {
            await db.delete(batches).where(eq(batches.id, b.id));
          }
          if (parentBatch) {
            await db.delete(batches).where(eq(batches.id, parentBatch.id));
          }
          return NextResponse.json(
            { error: err?.message || 'Failed to create child batch', code: 'BATCH_CREATE_FAILED' },
            { status: 500 }
          );
        }
        createdBatches.push(childBatch);

        const childRecords = childCases.map((c) => ({
          batchId: childBatch.id,
          providerId: c.provider_id ?? null,
          companyId: company_id,
          specialtyRequired: spec,
          encounterDate: c.encounter_date || null,
          chartFileName: c.chart_file_name || null,
          companyFormId: c.company_form_id ?? null,
          status: 'unassigned',
          aiAnalysisStatus: 'pending',
          priority: 'normal',
        }));

        try {
          const childInserted = await db
            .insert(reviewCases)
            .values(childRecords)
            .returning({
              id: reviewCases.id,
              chart_file_name: reviewCases.chartFileName,
              provider_id: reviewCases.providerId,
              specialty_required: reviewCases.specialtyRequired,
              batch_id: reviewCases.batchId,
            });
          allInsertedCases.push(...childInserted);
        } catch (err: any) {
          for (const b of createdBatches) {
            await db.delete(batches).where(eq(batches.id, b.id));
          }
          if (parentBatch) {
            await db.delete(batches).where(eq(batches.id, parentBatch.id));
          }
          return NextResponse.json(
            { error: err?.message || 'Failed to create cases', code: 'CASES_CREATE_FAILED' },
            { status: 500 }
          );
        }
      }

      await auditLog({
        action: 'batch_created',
        resourceType: 'batch',
        resourceId: parentBatch?.id ?? createdBatches[0]?.id,
        metadata: {
          batch_name,
          company_id,
          mixed: true,
          specialties: distinctSpecialties,
          case_count: cases.length,
          status: batchStatus,
          child_batch_ids: createdBatches.map((b) => b.id),
        },
        request,
      });

      return NextResponse.json(
        {
          data: toSnake(parentBatch ?? createdBatches[0]),
          batches: createdBatches.map((b) => toSnake(b)),
          cases: allInsertedCases,
        },
        { status: 201 }
      );
    }

    // ── Single-specialty (default) path ────────────────────────────────────
    let batch;
    try {
      [batch] = await db
        .insert(batches)
        .values({
          batchName: batch_name,
          companyId: company_id,
          specialty: specialty ?? null,
          companyFormId: company_form_id ?? null,
          dateUploaded: new Date(),
          totalCases: cases.length,
          assignedCases: 0,
          completedCases: 0,
          status: batchStatus,
        })
        .returning();
    } catch (err: any) {
      return NextResponse.json(
        { error: err?.message || 'Failed to create batch', code: 'BATCH_CREATE_FAILED' },
        { status: 500 }
      );
    }

    // Create review_cases records for each case
    const caseRecords = cases.map((c) => ({
      batchId: batch.id,
      providerId: c.provider_id ?? null,
      companyId: company_id,
      specialtyRequired: c.specialty_required ?? specialty ?? null,
      encounterDate: c.encounter_date || null,
      chartFileName: c.chart_file_name || null,
      // Per-row override (D3) wins over batch default
      companyFormId: c.company_form_id ?? company_form_id ?? null,
      status: 'unassigned',
      aiAnalysisStatus: 'pending',
      priority: 'normal',
    }));

    let insertedCases;
    try {
      insertedCases = await db
        .insert(reviewCases)
        .values(caseRecords)
        .returning({
          id: reviewCases.id,
          chart_file_name: reviewCases.chartFileName,
          provider_id: reviewCases.providerId,
        });
    } catch (err: any) {
      // Clean up the batch if case creation fails
      await db.delete(batches).where(eq(batches.id, batch.id));
      return NextResponse.json(
        { error: err?.message || 'Failed to create cases', code: 'CASES_CREATE_FAILED' },
        { status: 500 }
      );
    }

    // Refresh total count (defensive)
    await db
      .update(batches)
      .set({ totalCases: cases.length })
      .where(eq(batches.id, batch.id));

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
      { data: toSnake(batch), batches: [toSnake(batch)], cases: insertedCases ?? [] },
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
