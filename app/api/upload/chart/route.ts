import { NextRequest, NextResponse } from 'next/server';
import { uploadChart } from '@/lib/storage';
import { analyzeChart } from '@/lib/ai/chart-analyzer';
import { auditLog } from '@/lib/utils/audit';
import { db } from '@/lib/db';
import {
  retentionSchedule,
  reviewCases,
  tags,
  caseTags,
  companyForms,
} from '@/lib/db/schema';
import { and, desc, eq } from 'drizzle-orm';
import { extractChartMetadata } from '@/lib/pdf/extractor';
import { getCurrentCadencePeriod } from '@/lib/cadence/periods';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export async function POST(request: NextRequest) {
  try {
    const ct = request.headers.get('content-type') || '';
    if (!ct.toLowerCase().includes('multipart/form-data')) {
      return NextResponse.json(
        { error: 'Expected multipart/form-data', code: 'UNSUPPORTED_MEDIA_TYPE' },
        { status: 415 }
      );
    }
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
    const [caseData] = await db
      .select({
        id: reviewCases.id,
        encounterDate: reviewCases.encounterDate,
        companyId: reviewCases.companyId,
        specialtyRequired: reviewCases.specialtyRequired,
        companyFormId: reviewCases.companyFormId,
        cadencePeriodLabel: reviewCases.cadencePeriodLabel,
        manualOverrides: reviewCases.manualOverrides,
      })
      .from(reviewCases)
      .where(eq(reviewCases.id, caseId))
      .limit(1);

    if (!caseData) {
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
      chartFilePath: blobUrl,
      chartFileName: file.name,
      updatedAt: new Date(),
    };
    if (metadata) {
      if (metadata.patient_first) caseUpdate.patientFirstName = metadata.patient_first;
      if (metadata.patient_last) caseUpdate.patientLastName = metadata.patient_last;
      if (metadata.mrn) caseUpdate.mrnNumber = metadata.mrn;
      if (typeof metadata.is_pediatric === 'boolean') caseUpdate.isPediatric = metadata.is_pediatric;
      // Only set encounter_date if not already present
      if (metadata.encounter_date && !caseData.encounterDate) {
        caseUpdate.encounterDate = metadata.encounter_date;
      }
    }

    // ─── Phase 6.4 — AI auto-tag (cadence + specialty) ────────────────────
    // Honors Phase 6.5 manual_overrides[] — never clobber a field the
    // user/admin already touched.
    const overrides = new Set<string>(caseData.manualOverrides ?? []);

    // Encounter date for cadence resolution: prefer freshly extracted, else
    // existing on case. May still be null → cadence defaults to "today".
    const encounterForCadence: string | Date | null =
      (metadata?.encounter_date && !caseData.encounterDate
        ? metadata.encounter_date
        : caseData.encounterDate) ?? null;

    // 1) cadence_period_label
    let cadenceLabel: string | null = null;
    if (caseData.companyId && !overrides.has('cadence_period_label')) {
      try {
        const period = await getCurrentCadencePeriod(
          caseData.companyId,
          encounterForCadence
        );
        cadenceLabel = period?.label ?? null;
        if (cadenceLabel) caseUpdate.cadencePeriodLabel = cadenceLabel;
      } catch (e) {
        console.warn('[chart-upload] cadence resolve failed:', (e as Error).message);
      }
    } else if (caseData.cadencePeriodLabel) {
      cadenceLabel = caseData.cadencePeriodLabel;
    }

    // 2) specialty (extracted from chart) — prefer existing, else AI guess.
    const extractedSpecialty = metadata?.specialty_guess ?? null;
    if (
      extractedSpecialty &&
      !overrides.has('specialty') &&
      !caseData.specialtyRequired
    ) {
      caseUpdate.specialtyRequired = extractedSpecialty;
    }
    const effectiveSpecialty: string | null =
      caseData.specialtyRequired ?? extractedSpecialty ?? null;

    // 3) suggested company_form_id by (company, specialty, active)
    if (
      caseData.companyId &&
      effectiveSpecialty &&
      !overrides.has('company_form_id') &&
      !caseData.companyFormId
    ) {
      try {
        const [form] = await db
          .select({ id: companyForms.id })
          .from(companyForms)
          .where(
            and(
              eq(companyForms.companyId, caseData.companyId),
              eq(companyForms.specialty, effectiveSpecialty),
              eq(companyForms.isActive, true)
            )
          )
          .orderBy(desc(companyForms.createdAt))
          .limit(1);
        if (form?.id) caseUpdate.companyFormId = form.id;
      } catch (e) {
        console.warn('[chart-upload] form lookup failed:', (e as Error).message);
      }
    }

    // Update review_cases with chart info (store blob URL instead of path)
    await db.update(reviewCases).set(caseUpdate).where(eq(reviewCases.id, caseId));

    // 4) Tag inserts — find-or-create per SA-063D, source='ai'.
    const caseIdStr: string = caseId; // non-null past the validation gate above
    const findOrCreateTag = async (args: {
      name: string;
      scope: 'global' | 'cadence';
      companyId?: string | null;
      periodLabel?: string | null;
      color?: string;
    }): Promise<string | null> => {
      try {
        const whereClauses =
          args.scope === 'cadence' && args.companyId && args.periodLabel
            ? and(
                eq(tags.name, args.name),
                eq(tags.scope, 'cadence'),
                eq(tags.companyId, args.companyId),
                eq(tags.periodLabel, args.periodLabel)
              )
            : and(eq(tags.name, args.name), eq(tags.scope, 'global'));
        const [existing] = await db.select({ id: tags.id }).from(tags).where(whereClauses).limit(1);
        if (existing?.id) return existing.id;
        const [created] = await db
          .insert(tags)
          .values({
            name: args.name,
            scope: args.scope,
            companyId: args.scope === 'cadence' ? args.companyId ?? null : null,
            periodLabel: args.scope === 'cadence' ? args.periodLabel ?? null : null,
            color: args.color ?? (args.scope === 'cadence' ? 'amber' : 'cobalt'),
            createdBy: 'ai',
          })
          .returning({ id: tags.id });
        return created?.id ?? null;
      } catch (e) {
        console.warn('[chart-upload] tag upsert failed:', (e as Error).message);
        return null;
      }
    };

    const attachCaseTag = async (tagId: string) => {
      try {
        // case_tags has no UNIQUE — guard with a select.
        const existing = await db
          .select({ caseId: caseTags.caseId })
          .from(caseTags)
          .where(and(eq(caseTags.caseId, caseIdStr), eq(caseTags.tagId, tagId)))
          .limit(1);
        if (existing.length > 0) return;
        await db.insert(caseTags).values({
          caseId: caseIdStr,
          tagId,
          taggedBy: 'ai',
          source: 'ai',
        });
      } catch (e) {
        console.warn('[chart-upload] case_tags insert failed:', (e as Error).message);
      }
    };

    if (cadenceLabel && caseData.companyId) {
      const tagId = await findOrCreateTag({
        name: cadenceLabel,
        scope: 'cadence',
        companyId: caseData.companyId,
        periodLabel: cadenceLabel,
      });
      if (tagId) await attachCaseTag(tagId);
    }
    if (effectiveSpecialty) {
      const tagId = await findOrCreateTag({
        name: effectiveSpecialty,
        scope: 'global',
      });
      if (tagId) await attachCaseTag(tagId);
    }
    // ─── End Phase 6.4 ────────────────────────────────────────────────────

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
