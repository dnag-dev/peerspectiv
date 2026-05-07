/**
 * SA-013A — Per-Provider Review Answers (Type 1).
 *
 * Single review_results row → PDF showing every question, peer's answer,
 * default answer, score (100/0/excluded), MRN, peer name+license, comments,
 * total measures met %.
 *
 * Source of truth:
 *   - The peer's per-question outcomes are stored in `review_results.criteria_scores`
 *     (jsonb, array of `{criterion, score, score_label, rationale, ...}`).
 *     `score === 4` denotes default-match (100), `0` denotes non-default,
 *     and the peer-submit endpoint excludes NA from the array entirely.
 *   - `review_results.scoring_breakdown` (Phase 1.3) contains the per-question
 *     output of `scoreReview()`. When present we use its excluded-flags and
 *     score_pct directly. The roll-up % is recomputed from the breakdown rows
 *     so it always matches `scoreReview()` exactly (the breakdown column
 *     stores only the per_question array — see /api/peer/submit).
 */

import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { renderPdfToBuffer } from '@/lib/pdf/render';
import {
  PerProviderReviewAnswersPdf,
  type PerProviderReviewAnswersData,
} from '@/lib/pdf/templates/PerProviderReviewAnswersPdf';
import type { FormField } from '@/lib/scoring/default-based';

interface RowShape {
  result_id: string;
  case_id: string;
  company_id: string;
  company_name: string;
  provider_first: string | null;
  provider_last: string | null;
  provider_specialty: string | null;
  mrn: string | null;
  peer_name_snapshot: string | null;
  peer_license_snapshot: string | null;
  peer_license_state_snapshot: string | null;
  submitted_at: string;
  scoring_breakdown: unknown;
  criteria_scores: unknown;
  narrative_final: string | null;
  form_name: string | null;
  form_fields: unknown;
}

interface BreakdownItem {
  field_key: string;
  score_pct: number | null;
  excluded: boolean;
  normalized_value?: string;
  raw_value?: unknown;
  comment?: string;
}

interface CriterionItem {
  criterion: string;
  score: number;
  score_label?: string;
  rationale?: string;
}

function rowsOf<T>(result: unknown): T[] {
  return ((result as { rows?: T[] }).rows ?? (result as T[])) as T[];
}

function asFormFields(raw: unknown): FormField[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((f): f is Record<string, unknown> => !!f && typeof f === 'object')
    .map((f) => ({
      field_key: String(f.field_key ?? ''),
      field_label: String(f.field_label ?? f.field_key ?? ''),
      field_type: (f.field_type as FormField['field_type']) ?? 'yes_no_na',
      default_answer: f.default_answer == null ? null : String(f.default_answer),
      option_set: Array.isArray(f.option_set) ? (f.option_set as string[]) : undefined,
      is_required: Boolean(f.is_required),
      is_critical: Boolean(f.is_critical),
    }))
    .filter((f) => f.field_key);
}

function asBreakdown(raw: unknown): BreakdownItem[] | null {
  if (!Array.isArray(raw)) return null;
  return raw
    .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
    .map((x) => ({
      field_key: String(x.field_key ?? ''),
      score_pct: x.score_pct == null ? null : Number(x.score_pct),
      excluded: Boolean(x.excluded),
      normalized_value:
        typeof x.normalized_value === 'string' ? x.normalized_value : undefined,
      raw_value: x.raw_value,
      comment: typeof x.comment === 'string' ? x.comment : undefined,
    }))
    .filter((x) => x.field_key);
}

function asCriteria(raw: unknown): CriterionItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
    .map((x) => ({
      criterion: String(x.criterion ?? ''),
      score: Number(x.score ?? 0),
      score_label: typeof x.score_label === 'string' ? x.score_label : undefined,
      rationale: typeof x.rationale === 'string' ? x.rationale : undefined,
    }))
    .filter((x) => x.criterion);
}

/** Reusable question row type — shared between PDF generation and inline HTML view. */
export type QuestionRow = PerProviderReviewAnswersData['questions'][number];

export interface QuestionsSummary {
  questions: QuestionRow[];
  totalMeasuresMetPct: number | null;
  numerator: number;
  denominator: number;
}

/**
 * Build the per-question answers + roll-up score from raw form fields and
 * review result data. Used by both the PDF generator and the inline completed
 * review view in the peer portal.
 */
export function buildQuestionsFromResult(
  rawFormFields: unknown,
  scoringBreakdown: unknown,
  criteriaScores: unknown,
): QuestionsSummary {
  const fields = asFormFields(rawFormFields);
  const breakdown = asBreakdown(scoringBreakdown);
  const criteria = asCriteria(criteriaScores);
  const criteriaByKey = new Map(criteria.map((c) => [c.criterion, c] as const));

  const breakdownByKey = breakdown
    ? new Map(breakdown.map((b) => [b.field_key, b] as const))
    : null;

  const questions: QuestionRow[] = (
    fields.length > 0
      ? fields
      : criteria.map<FormField>((c) => ({
          field_key: c.criterion,
          field_label: c.criterion,
          field_type: 'yes_no_na',
          default_answer: 'yes',
        }))
  ).map((f) => {
    const b = breakdownByKey?.get(f.field_key) ?? null;
    const c = criteriaByKey.get(f.field_key);
    let excluded = false;
    let score: 100 | 0 | null = 0;
    let peerAnswer: string | null = null;

    if (b) {
      excluded = b.excluded;
      score = excluded ? null : b.score_pct === 100 ? 100 : 0;
      peerAnswer =
        b.raw_value == null
          ? null
          : typeof b.raw_value === 'string'
          ? b.raw_value
          : String(b.raw_value);
      if (!peerAnswer && b.normalized_value) {
        peerAnswer =
          b.normalized_value === 'default'
            ? f.default_answer ?? 'default'
            : b.normalized_value === 'na'
            ? 'NA'
            : '';
      }
    } else if (c) {
      excluded = f.field_type === 'text' || f.field_type === 'rating';
      if (!excluded) {
        score = c.score >= 4 ? 100 : 0;
      } else {
        score = null;
      }
      peerAnswer = c.score_label ?? (c.score >= 4 ? f.default_answer ?? 'yes' : 'no');
    } else {
      excluded = f.field_type === 'text' || f.field_type === 'rating';
      score = excluded ? null : 0;
    }

    return {
      field_label: f.field_label,
      default_answer: f.default_answer,
      peer_answer: peerAnswer,
      score,
      excluded,
      comment: b?.comment ?? c?.rationale ?? null,
    };
  });

  let numerator = 0;
  let denominator = 0;
  for (const q of questions) {
    if (q.excluded) continue;
    denominator += 1;
    if (q.score === 100) numerator += 1;
  }
  const totalMeasuresMetPct =
    denominator === 0 ? null : Math.round((numerator / denominator) * 10000) / 100;

  return { questions, totalMeasuresMetPct, numerator, denominator };
}

export interface GenerateInput {
  resultId: string;
}

export async function generate(input: GenerateInput): Promise<Buffer> {
  const rows = rowsOf<RowShape>(
    await db.execute(sql`
      SELECT
        rr.id AS result_id,
        rc.id AS case_id,
        rc.company_id,
        co.name AS company_name,
        p.first_name AS provider_first,
        p.last_name AS provider_last,
        p.specialty AS provider_specialty,
        rr.mrn_number AS mrn,
        rr.reviewer_name_snapshot AS peer_name_snapshot,
        rr.reviewer_license_snapshot AS peer_license_snapshot,
        rr.reviewer_license_state_snapshot AS peer_license_state_snapshot,
        rr.submitted_at,
        rr.scoring_breakdown,
        rr.criteria_scores,
        rr.narrative_final,
        cf.form_name,
        cf.form_fields
      FROM review_results rr
      INNER JOIN review_cases rc ON rc.id = rr.case_id
      INNER JOIN providers     p  ON p.id  = rc.provider_id
      INNER JOIN companies     co ON co.id = rc.company_id
      LEFT  JOIN company_forms cf ON cf.id = rc.company_form_id
      WHERE rr.id = ${input.resultId}
      LIMIT 1
    `)
  );
  const row = rows[0];
  if (!row) throw new Error(`Review result not found: ${input.resultId}`);

  const { questions, totalMeasuresMetPct, numerator, denominator } =
    buildQuestionsFromResult(row.form_fields, row.scoring_breakdown, row.criteria_scores);

  const providerName =
    [row.provider_first, row.provider_last].filter(Boolean).join(' ').trim() || 'Unknown provider';

  const data: PerProviderReviewAnswersData = {
    companyName: row.company_name,
    providerName,
    providerSpecialty: row.provider_specialty,
    reviewType: row.form_name ?? 'Review',
    mrn: row.mrn,
    peerName: row.peer_name_snapshot,
    peerLicense: row.peer_license_snapshot,
    peerLicenseState: row.peer_license_state_snapshot,
    submittedAt: new Date(row.submitted_at).toISOString().slice(0, 10),
    totalMeasuresMetPct,
    numerator,
    denominator,
    questions,
    generalComments: row.narrative_final,
  };

  return renderPdfToBuffer(PerProviderReviewAnswersPdf({ data }) as any);
}
