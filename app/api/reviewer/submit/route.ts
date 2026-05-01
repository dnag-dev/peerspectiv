import { NextRequest, NextResponse } from 'next/server';
import { and, eq, isNull } from 'drizzle-orm';
import { supabaseAdmin } from '@/lib/supabase/server';
import { scoreReviewerQuality } from '@/lib/ai/quality-scorer';
import { auditLog } from '@/lib/utils/audit';
import { db } from '@/lib/db';
import { retentionSchedule, reviewResults, correctiveActions } from '@/lib/db/schema';
import { generateCorrectiveActionPlan } from '@/lib/ai/report-generator';
import type { CriterionScore, Deficiency, ReviewerChange } from '@/types';

interface SubmitBody {
  case_id: string;
  criteria_scores: CriterionScore[];
  deficiencies: Deficiency[];
  overall_score: number;
  narrative_final: string;
  time_spent_minutes: number;
  license_snapshot?: {
    license_number: string;
    license_state: string;
    attested_at: string;
  };
  // Section C.4 additions
  mrn_number?: string;
  reviewer_signature_text?: string;
  // Section C.3 — full yes_no answers used for NA-aware scoring.
  form_responses?: Record<string, { value: unknown; comment?: string }>;
}

export async function POST(request: NextRequest) {
  try {
    const body: SubmitBody = await request.json();
    const {
      case_id,
      criteria_scores,
      deficiencies,
      overall_score: overall_score_in,
      narrative_final,
      time_spent_minutes,
      license_snapshot,
      mrn_number,
      reviewer_signature_text,
      form_responses,
    } = body;
    let overall_score = overall_score_in;

    // Section C.3 — yes_no scoring with N/A excluded.
    // numerator = yes count, denominator = yes + no count.
    if (form_responses && typeof form_responses === 'object') {
      let yes = 0;
      let no = 0;
      for (const resp of Object.values(form_responses)) {
        const v = resp?.value;
        if (v === true || v === 'yes') yes++;
        else if (v === false || v === 'no') no++;
        // 'na' (or anything else) is excluded from numerator/denominator
      }
      const denom = yes + no;
      if (denom > 0) {
        // Round to 2 decimals so 8/9 yields 88.89 (not 89). DB column is
        // numeric(5,2) — see migration 010.
        const yesNoScore = Math.round((yes / denom) * 10000) / 100;
        // Average with the existing rating-based overall_score when both exist.
        if (typeof overall_score_in === 'number' && criteria_scores?.length) {
          overall_score = Math.round(((overall_score_in + yesNoScore) / 2) * 100) / 100;
        } else {
          overall_score = yesNoScore;
        }
      }
    }

    if (!case_id || !criteria_scores || overall_score == null || !narrative_final) {
      return NextResponse.json(
        { error: 'case_id, criteria_scores, overall_score, and narrative_final are required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // HRSA audit gate — license snapshot required at submission
    if (
      !license_snapshot ||
      !license_snapshot.license_number?.trim() ||
      !license_snapshot.license_state?.trim()
    ) {
      return NextResponse.json(
        { error: 'License attestation is required for HRSA audit', code: 'LICENSE_REQUIRED' },
        { status: 400 }
      );
    }

    // Fetch case and AI analysis for agreement comparison
    const { data: caseData, error: caseError } = await supabaseAdmin
      .from('review_cases')
      .select('id, reviewer_id, status')
      .eq('id', case_id)
      .single();

    if (caseError || !caseData) {
      return NextResponse.json(
        { error: 'Case not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    if (caseData.status === 'completed') {
      return NextResponse.json(
        { error: 'This case has already been submitted', code: 'ALREADY_SUBMITTED' },
        { status: 409 }
      );
    }

    // Fetch AI analysis for comparison
    const { data: aiAnalysis } = await supabaseAdmin
      .from('ai_analyses')
      .select('criteria_scores')
      .eq('case_id', case_id)
      .single();

    // Calculate AI agreement percentage and build reviewer_changes
    let aiAgreementPercentage: number | null = null;
    let reviewerChanges: ReviewerChange[] = [];

    if (aiAnalysis?.criteria_scores && Array.isArray(aiAnalysis.criteria_scores)) {
      const aiScores = aiAnalysis.criteria_scores as CriterionScore[];
      let agreements = 0;
      let total = 0;

      for (const reviewerScore of criteria_scores) {
        const aiScore = aiScores.find((a) => a.criterion === reviewerScore.criterion);
        if (aiScore) {
          total++;
          if (aiScore.score === reviewerScore.score) {
            agreements++;
          } else {
            reviewerChanges.push({
              criterion: reviewerScore.criterion,
              ai_score: aiScore.score,
              reviewer_score: reviewerScore.score,
              reason: reviewerScore.rationale || 'No reason provided',
            });
          }
        }
      }

      aiAgreementPercentage = total > 0 ? Math.round((agreements / total) * 100) : null;
    }

    // Resolve reviewer full name for the snapshot
    let reviewerNameSnapshot: string | null = null;
    if (caseData.reviewer_id) {
      const { data: reviewerRow } = await supabaseAdmin
        .from('reviewers')
        .select('full_name')
        .eq('id', caseData.reviewer_id)
        .single();
      reviewerNameSnapshot = reviewerRow?.full_name ?? null;
    }

    // Save to review_results — Drizzle onConflictDoUpdate (NOT supabase-js
    // upsert, which mis-serializes JSONB arrays into `{}`). See P0 fix in
    // Phase 5.0.
    const submittedAt = new Date();
    const deficienciesArr: Deficiency[] = deficiencies || [];
    const aiAgreementStr =
      aiAgreementPercentage != null ? String(aiAgreementPercentage) : null;
    const licenseNumber = license_snapshot.license_number.trim();
    const licenseState = license_snapshot.license_state.trim().toUpperCase();

    const mrnSnapshot = mrn_number?.trim() || null;
    const signatureText = reviewer_signature_text?.trim() || null;

    const insertedRows = await db
      .insert(reviewResults)
      .values({
        caseId: case_id,
        reviewerId: caseData.reviewer_id,
        criteriaScores: criteria_scores,
        deficiencies: deficienciesArr,
        overallScore: overall_score == null ? null : String(overall_score),
        narrativeFinal: narrative_final,
        aiAgreementPercentage: aiAgreementStr,
        reviewerChanges: reviewerChanges,
        timeSpentMinutes: time_spent_minutes || null,
        submittedAt,
        reviewerNameSnapshot,
        reviewerLicenseSnapshot: licenseNumber,
        reviewerLicenseStateSnapshot: licenseState,
        mrnNumber: mrnSnapshot,
        reviewerSignatureText: signatureText,
      })
      .onConflictDoUpdate({
        target: reviewResults.caseId,
        set: {
          reviewerId: caseData.reviewer_id,
          criteriaScores: criteria_scores,
          deficiencies: deficienciesArr,
          overallScore: overall_score == null ? null : String(overall_score),
          narrativeFinal: narrative_final,
          aiAgreementPercentage: aiAgreementStr,
          reviewerChanges: reviewerChanges,
          timeSpentMinutes: time_spent_minutes || null,
          submittedAt,
          reviewerNameSnapshot,
          reviewerLicenseSnapshot: licenseNumber,
          reviewerLicenseStateSnapshot: licenseState,
          mrnNumber: mrnSnapshot,
          reviewerSignatureText: signatureText,
        },
      })
      .returning();

    const result = insertedRows[0];
    if (!result) {
      return NextResponse.json(
        { error: 'Insert returned no row', code: 'SUBMIT_FAILED' },
        { status: 500 }
      );
    }

    // Readback shape guard — verify JSONB arrays persisted as arrays with
    // matching length. Catches any future serialization regression at the
    // point of failure rather than silently shipping hollow data.
    const persistedCriteria = result.criteriaScores as unknown;
    const persistedDeficiencies = result.deficiencies as unknown;
    const criteriaOk =
      Array.isArray(persistedCriteria) &&
      persistedCriteria.length === criteria_scores.length;
    const deficienciesOk =
      Array.isArray(persistedDeficiencies) &&
      persistedDeficiencies.length === deficienciesArr.length;
    if (!criteriaOk || !deficienciesOk) {
      console.error('[API] PERSIST_SHAPE_MISMATCH for case:', case_id, {
        criteriaInputLen: criteria_scores.length,
        criteriaPersistedType: Array.isArray(persistedCriteria)
          ? 'array'
          : typeof persistedCriteria,
        criteriaPersistedLen: Array.isArray(persistedCriteria)
          ? persistedCriteria.length
          : null,
        deficienciesInputLen: deficienciesArr.length,
        deficienciesPersistedType: Array.isArray(persistedDeficiencies)
          ? 'array'
          : typeof persistedDeficiencies,
        deficienciesPersistedLen: Array.isArray(persistedDeficiencies)
          ? persistedDeficiencies.length
          : null,
      });
      await auditLog({
        action: 'review_persist_shape_mismatch',
        resourceType: 'review_result',
        resourceId: case_id,
        metadata: {
          criteriaInputLen: criteria_scores.length,
          criteriaPersistedIsArray: Array.isArray(persistedCriteria),
          deficienciesInputLen: deficienciesArr.length,
          deficienciesPersistedIsArray: Array.isArray(persistedDeficiencies),
        },
        request,
      });
      return NextResponse.json(
        {
          error:
            'Review saved but JSONB shape did not match input. Refusing to mark case completed.',
          code: 'PERSIST_SHAPE_MISMATCH',
        },
        { status: 500 }
      );
    }

    // Update review_cases status to completed (and snapshot MRN — Section C.4)
    await supabaseAdmin
      .from('review_cases')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString(),
        ...(mrnSnapshot ? { mrn_number: mrnSnapshot } : {}),
      })
      .eq('id', case_id);

    // Retention hook -- extend chart retention 30 days past review completion.
    try {
      const deleteAfter = new Date();
      deleteAfter.setDate(deleteAfter.getDate() + 30);
      await db
        .update(retentionSchedule)
        .set({ deleteAfter })
        .where(
          and(
            eq(retentionSchedule.entityId, case_id),
            eq(retentionSchedule.entityType, 'chart_file'),
            isNull(retentionSchedule.deletedAt)
          )
        );
    } catch (retentionErr) {
      console.error('[API] retention extend failed for case:', case_id, retentionErr);
    }

    // Decrement reviewer active_cases_count
    if (caseData.reviewer_id) {
      const { data: reviewer } = await supabaseAdmin
        .from('reviewers')
        .select('active_cases_count')
        .eq('id', caseData.reviewer_id)
        .single();

      if (reviewer) {
        await supabaseAdmin
          .from('reviewers')
          .update({
            active_cases_count: Math.max(0, (reviewer.active_cases_count || 0) - 1),
            updated_at: new Date().toISOString(),
          })
          .eq('id', caseData.reviewer_id);
      }
    }

    // Update batch completed count
    const { data: batchCase } = await supabaseAdmin
      .from('review_cases')
      .select('batch_id')
      .eq('id', case_id)
      .single();

    if (batchCase?.batch_id) {
      const { count } = await supabaseAdmin
        .from('review_cases')
        .select('*', { count: 'exact', head: true })
        .eq('batch_id', batchCase.batch_id)
        .eq('status', 'completed');

      await supabaseAdmin
        .from('batches')
        .update({ completed_cases: count || 0 })
        .eq('id', batchCase.batch_id);
    }

    // Trigger quality scoring in the background
    scoreReviewerQuality(case_id).catch((err) => {
      console.error('[API] Quality scoring failed for case:', case_id, err);
    });

    // Section J4 — auto-draft a Corrective Action Plan when the result hits
    // the threshold (overall_score < 70 OR any deficiencies). Runs in the
    // background; never blocks the submit response.
    const shouldDraftCap =
      (typeof overall_score === 'number' && overall_score < 70) ||
      deficienciesArr.length > 0;
    if (shouldDraftCap) {
      (async () => {
        try {
          const cap = await generateCorrectiveActionPlan(case_id, deficienciesArr);
          // Look up companyId + providerId from the case for the CAP row.
          const { data: caseCtx } = await supabaseAdmin
            .from('review_cases')
            .select('company_id, provider_id')
            .eq('id', case_id)
            .single();
          await db.insert(correctiveActions).values({
            companyId: caseCtx?.company_id ?? null,
            providerId: caseCtx?.provider_id ?? null,
            title: cap.title,
            description: cap.description,
            identifiedIssue: cap.identified_issue,
            assignedTo: null,
            status: 'open',
            sourceCaseId: case_id,
          });
        } catch (capErr) {
          console.error('[API] CAP auto-draft failed for case:', case_id, capErr);
        }
      })();
    }

    await auditLog({
      action: 'review_submitted',
      resourceType: 'review_case',
      resourceId: case_id,
      metadata: {
        overall_score,
        ai_agreement_percentage: aiAgreementPercentage,
        changes_count: reviewerChanges.length,
        time_spent_minutes,
      },
      request,
    });

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (err) {
    console.error('[API] POST /api/reviewer/submit error:', err);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
