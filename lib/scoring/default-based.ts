/**
 * Default-based scoring engine.
 *
 * Per question, the peer's response is compared against the form's
 * `default_answer`. The score reduces to "did the answer match the default?"
 * with N/A excluded from both numerator and denominator. Narrative fields
 * (text) are excluded entirely — they don't roll up into the percent.
 *
 * Pure module: no DB access, no network. Deterministic. Suitable for
 * server-side scoring + UI preview side-by-side.
 */

export type ResponseValue = string | number | boolean | null;

export interface FormField {
  field_key: string;
  field_label: string;
  field_type: 'yes_no_na' | 'abc_na' | 'text' | 'rating' | 'pass_fail';
  default_answer: string | null;
  option_set?: string[];
  is_required?: boolean;
  is_critical?: boolean;
}

export interface PerQuestionScore {
  field_key: string;
  raw_value: ResponseValue;
  normalized_value: 'default' | 'non_default' | 'na' | 'narrative';
  score_pct: number | null;
  excluded: boolean;
}

export interface ReviewScore {
  per_question: PerQuestionScore[];
  numerator: number;
  denominator: number;
  total_measures_met_pct: number | null;
}

function isNa(value: ResponseValue): boolean {
  if (value == null) return false;
  if (typeof value !== 'string') return false;
  return value.trim().toLowerCase() === 'na' || value.trim().toLowerCase() === 'n/a';
}

function isNarrativeField(field: FormField): boolean {
  return field.field_type === 'text' || field.field_type === 'rating';
}

function valuesMatch(a: ResponseValue, b: ResponseValue): boolean {
  if (a == null || b == null) return false;
  const norm = (v: ResponseValue): string => {
    if (typeof v === 'boolean') return v ? 'yes' : 'no';
    return String(v).trim().toLowerCase();
  };
  return norm(a) === norm(b);
}

function roundPct(num: number, denom: number): number {
  if (denom === 0) return 0;
  return Math.round((num / denom) * 10000) / 100;
}

export function scoreReview(
  form: { form_fields: FormField[] },
  responses: Record<string, ResponseValue>
): ReviewScore {
  const perQuestion: PerQuestionScore[] = [];
  let numerator = 0;
  let denominator = 0;

  for (const field of form.form_fields) {
    const raw = responses[field.field_key] ?? null;

    if (isNarrativeField(field)) {
      perQuestion.push({
        field_key: field.field_key,
        raw_value: raw,
        normalized_value: 'narrative',
        score_pct: null,
        excluded: true,
      });
      continue;
    }

    if (isNa(raw)) {
      perQuestion.push({
        field_key: field.field_key,
        raw_value: raw,
        normalized_value: 'na',
        score_pct: null,
        excluded: true,
      });
      continue;
    }

    if (raw == null || raw === '') {
      perQuestion.push({
        field_key: field.field_key,
        raw_value: raw,
        normalized_value: 'non_default',
        score_pct: 0,
        excluded: false,
      });
      denominator += 1;
      continue;
    }

    const matched = valuesMatch(raw, field.default_answer);
    if (matched) {
      perQuestion.push({
        field_key: field.field_key,
        raw_value: raw,
        normalized_value: 'default',
        score_pct: 100,
        excluded: false,
      });
      numerator += 1;
      denominator += 1;
    } else {
      perQuestion.push({
        field_key: field.field_key,
        raw_value: raw,
        normalized_value: 'non_default',
        score_pct: 0,
        excluded: false,
      });
      denominator += 1;
    }
  }

  const total = denominator === 0 ? null : roundPct(numerator, denominator);

  return {
    per_question: perQuestion,
    numerator,
    denominator,
    total_measures_met_pct: total,
  };
}
