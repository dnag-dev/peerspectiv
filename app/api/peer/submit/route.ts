import { NextRequest, NextResponse } from 'next/server';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { scorePeerQuality } from '@/lib/ai/quality-scorer';
import { auditLog } from '@/lib/utils/audit';
import { db, toSnake } from '@/lib/db';
import {
  retentionSchedule,
  reviewResults,
  reviewCases,
  peers,
  batches,
  aiAnalyses,
  correctiveActions,
} from '@/lib/db/schema';
import { generateCorrectiveActionPlan } from '@/lib/ai/report-generator';
import { scoreReview, type FormField, type ResponseValue } from '@/lib/scoring/default-based';
import { companyForms } from '@/lib/db/schema';
import type { CriterionScore, Deficiency, PeerChange } from '@/types';
import { syncBatchStatus } from '@/lib/batches/sync-status';

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
  /** PR-036 — 'manual' | 'ai_extracted' | 'corrected' */
  mrn_source?: string;
  peer_signature_text?: string;
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
      mrn_source,
      peer_signature_text,
      form_responses,
    } = body;
    let overall_score = overall_score_in;

    // Phase 1.3 — default-based scoring engine (replaces inline yes_no math).
    // Looks up the company_form attached to this case to pick scoring_system
    // and form_fields (each with a default_answer). N/A excluded; non-default
    // counts against denominator only.
    let scoringResult: ReturnType<typeof scoreReview> | null = null;
    if (form_responses && typeof form_responses === 'object') {
      // Resolve form_fields/scoring_system from the case's company_form.
      const [caseRow] = await db
        .select({ companyFormId: reviewCases.companyFormId })
        .from(reviewCases)
        .where(eq(reviewCases.id, case_id))
        .limit(1);
      let formFields: FormField[] = [];
      if (caseRow?.companyFormId) {
        const [formRow] = await db
          .select({
            formFields: companyForms.formFields,
          })
          .from(companyForms)
          .where(eq(companyForms.id, caseRow.companyFormId))
          .limit(1);
        if (formRow) {
          formFields = (formRow.formFields as FormField[]) ?? [];
        }
      }

      // Map { value, comment } → raw value
      const responses: Record<string, ResponseValue> = {};
      for (const [k, v] of Object.entries(form_responses)) {
        responses[k] = (v?.value ?? null) as ResponseValue;
      }

      if (formFields.length > 0) {
        scoringResult = scoreReview(
          { form_fields: formFields },
          responses
        );
        // Enrich scoring breakdown with per-question comments from form_responses
        if (scoringResult.per_question) {
          for (const pq of scoringResult.per_question) {
            const comment = form_responses[pq.field_key]?.comment;
            if (comment) (pq as unknown as Record<string, unknown>).comment = comment;
          }
        }
        if (scoringResult.total_measures_met_pct != null) {
          if (typeof overall_score_in === 'number' && criteria_scores?.length) {
            overall_score = Math.round(((overall_score_in + scoringResult.total_measures_met_pct) / 2) * 100) / 100;
          } else {
            overall_score = scoringResult.total_measures_met_pct;
          }
        }
      } else {
        // Fallback: legacy inline yes_no math when no company_form is attached.
        let yes = 0;
        let no = 0;
        for (const resp of Object.values(form_responses)) {
          const v = resp?.value;
          if (v === true || v === 'yes') yes++;
          else if (v === false || v === 'no') no++;
        }
        const denom = yes + no;
        if (denom > 0) {
          const yesNoScore = Math.round((yes / denom) * 10000) / 100;
          if (typeof overall_score_in === 'number' && criteria_scores?.length) {
            overall_score = Math.round(((overall_score_in + yesNoScore) / 2) * 100) / 100;
          } else {
            overall_score = yesNoScore;
          }
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
    const [caseData] = await db
      .select({
        id: reviewCases.id,
        peerId: reviewCases.peerId,
        status: reviewCases.status,
      })
      .from(reviewCases)
      .where(eq(reviewCases.id, case_id))
      .limit(1);

    if (!caseData) {
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
    const [aiAnalysis] = await db
      .select({ criteriaScores: aiAnalyses.criteriaScores })
      .from(aiAnalyses)
      .where(eq(aiAnalyses.caseId, case_id))
      .limit(1);

    // Calculate AI agreement percentage and build peer_changes
    let aiAgreementPercentage: number | null = null;
    let peerChanges: PeerChange[] = [];

    if (aiAnalysis?.criteriaScores && Array.isArray(aiAnalysis.criteriaScores)) {
      const aiScores = aiAnalysis.criteriaScores as CriterionScore[];
      let agreements = 0;
      let total = 0;

      for (const peerScore of criteria_scores) {
        const aiScore = aiScores.find((a) => a.criterion === peerScore.criterion);
        if (aiScore) {
          total++;
          if (aiScore.score === peerScore.score) {
            agreements++;
          } else {
            peerChanges.push({
              criterion: peerScore.criterion,
              ai_score: aiScore.score,
              peer_score: peerScore.score,
              reason: peerScore.rationale || 'No reason provided',
            });
          }
        }
      }

      aiAgreementPercentage = total > 0 ? Math.round((agreements / total) * 100) : null;
    }

    // Resolve peer full name for the snapshot
    let peerNameSnapshot: string | null = null;
    if (caseData.peerId) {
      const [peerRow] = await db
        .select({ fullName: peers.fullName })
        .from(peers)
        .where(eq(peers.id, caseData.peerId))
        .limit(1);
      peerNameSnapshot = peerRow?.fullName ?? null;
    }

    // Save to review_results
    const submittedAt = new Date();
    const deficienciesArr: Deficiency[] = deficiencies || [];
    const aiAgreementStr =
      aiAgreementPercentage != null ? String(aiAgreementPercentage) : null;
    const licenseNumber = license_snapshot.license_number.trim();
    const licenseState = license_snapshot.license_state.trim().toUpperCase();

    const mrnSnapshot = mrn_number?.trim() || null;
    const signatureText = peer_signature_text?.trim() || null;
    const mrnSourceClean =
      mrn_source && ['manual', 'ai_extracted', 'corrected'].includes(mrn_source)
        ? mrn_source
        : null;

    const insertedRows = await db
      .insert(reviewResults)
      .values({
        caseId: case_id,
        peerId: caseData.peerId,
        criteriaScores: criteria_scores,
        deficiencies: deficienciesArr,
        overallScore: overall_score,
        narrativeFinal: narrative_final,
        aiAgreementPercentage: aiAgreementStr,
        peerChanges: peerChanges,
        timeSpentMinutes: time_spent_minutes || null,
        submittedAt,
        peerNameSnapshot,
        peerLicenseSnapshot: licenseNumber,
        peerLicenseStateSnapshot: licenseState,
        mrnNumber: mrnSnapshot,
        peerSignatureText: signatureText,
        scoringBreakdown: scoringResult ? scoringResult.per_question : null,
        scoringEngineVersion: scoringResult ? 'default_based_v1' : null,
      })
      .onConflictDoUpdate({
        target: reviewResults.caseId,
        set: {
          peerId: caseData.peerId,
          criteriaScores: criteria_scores,
          deficiencies: deficienciesArr,
          overallScore: overall_score,
          narrativeFinal: narrative_final,
          aiAgreementPercentage: aiAgreementStr,
          peerChanges: peerChanges,
          timeSpentMinutes: time_spent_minutes || null,
          submittedAt,
          peerNameSnapshot,
          peerLicenseSnapshot: licenseNumber,
          peerLicenseStateSnapshot: licenseState,
          mrnNumber: mrnSnapshot,
          peerSignatureText: signatureText,
          scoringBreakdown: scoringResult ? scoringResult.per_question : null,
          scoringEngineVersion: scoringResult ? 'default_based_v1' : null,
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

    // Readback shape guard
    const persistedCriteria = result.criteriaScores as unknown;
    const persistedDeficiencies = result.deficiencies as unknown;
    const criteriaOk =
      Array.isArray(persistedCriteria) &&
      persistedCriteria.length === criteria_scores.length;
    const deficienciesOk =
      Array.isArray(persistedDeficiencies) &&
      persistedDeficiencies.length === deficienciesArr.length;
    if (!criteriaOk || !deficienciesOk) {
      console.error('[API] PERSIST_SHAPE_MISMATCH for case:', case_id);
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
    await db
      .update(reviewCases)
      .set({
        status: 'completed',
        updatedAt: new Date(),
        ...(mrnSnapshot ? { mrnNumber: mrnSnapshot } : {}),
        ...(mrnSourceClean ? { mrnSource: mrnSourceClean } : {}),
      })
      .where(eq(reviewCases.id, case_id));

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

    // Decrement peer active_cases_count
    if (caseData.peerId) {
      const [peer] = await db
        .select({ activeCasesCount: peers.activeCasesCount })
        .from(peers)
        .where(eq(peers.id, caseData.peerId))
        .limit(1);

      if (peer) {
        await db
          .update(peers)
          .set({
            activeCasesCount: Math.max(0, (peer.activeCasesCount || 0) - 1),
            updatedAt: new Date(),
          })
          .where(eq(peers.id, caseData.peerId));
      }
    }

    // Update batch completed count
    const [batchCase] = await db
      .select({ batchId: reviewCases.batchId })
      .from(reviewCases)
      .where(eq(reviewCases.id, case_id))
      .limit(1);

    if (batchCase?.batchId) {
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(reviewCases)
        .where(and(eq(reviewCases.batchId, batchCase.batchId), eq(reviewCases.status, 'completed')));

      await db
        .update(batches)
        .set({ completedCases: count || 0 })
        .where(eq(batches.id, batchCase.batchId));

      // Sync batch status (may transition to 'completed' if all cases done)
      try { await syncBatchStatus(batchCase.batchId); } catch { /* best effort */ }
    }

    // Trigger quality scoring in the background
    scorePeerQuality(case_id).catch((err) => {
      console.error('[API] Quality scoring failed for case:', case_id, err);
    });

    // Section J4 — auto-draft Corrective Action Plan when threshold met
    const shouldDraftCap =
      (typeof overall_score === 'number' && overall_score < 70) ||
      deficienciesArr.length > 0;
    if (shouldDraftCap) {
      (async () => {
        try {
          const cap = await generateCorrectiveActionPlan(case_id, deficienciesArr);
          // Look up companyId + providerId from the case for the CAP row.
          const [caseCtx] = await db
            .select({ companyId: reviewCases.companyId, providerId: reviewCases.providerId })
            .from(reviewCases)
            .where(eq(reviewCases.id, case_id))
            .limit(1);
          await db.insert(correctiveActions).values({
            companyId: caseCtx?.companyId ?? null,
            providerId: caseCtx?.providerId ?? null,
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
        changes_count: peerChanges.length,
        time_spent_minutes,
      },
      request,
    });

    return NextResponse.json({ data: toSnake(result) }, { status: 201 });
  } catch (err) {
    console.error('[API] POST /api/peer/submit error:', err);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
