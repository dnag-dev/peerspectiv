import { NextRequest, NextResponse } from 'next/server';
import { callClaude } from '@/lib/ai/anthropic';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Phase 6.1 — AI form draft.
 *
 * POST /api/forms/ai-draft
 * Body: { specialty: string, form_name: string, scoring_system: 'yes_no_na'|'abc_na'|'pass_fail' }
 *
 * Returns: { form_fields: BuiltFormField[] } — 10–20 questions appropriate for
 * the specialty. For yes_no_na / abc_na the AI sets a sensible default_answer
 * per question; for pass_fail it marks 1–3 questions as is_critical.
 *
 * Admin-gated via demo_user cookie / x-demo-user-id header (matches the rest
 * of the admin API surface in this app).
 */

async function getAdminUserId(req: NextRequest): Promise<string | null> {
  try {
    const { auth } = await import('@clerk/nextjs/server');
    const result = auth();
    const userId = (result as any)?.userId;
    if (userId) return userId as string;
  } catch {
    /* clerk not configured */
  }
  const demo = req.headers.get('x-demo-user-id');
  if (demo && demo.trim()) return demo.trim();
  if (req.cookies.get('demo_user')?.value) return 'demo-admin';
  return null;
}

interface DraftField {
  field_key: string;
  field_label: string;
  field_type: 'yes_no' | 'rating' | 'text';
  is_required: boolean;
  display_order: number;
  default_answer?: 'yes' | 'no' | 'A' | 'B' | 'C' | null;
  is_critical?: boolean;
}

function safeKey(label: string, idx: number): string {
  const k = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 60);
  return k || `q_${idx + 1}`;
}

function buildPrompt(
  specialty: string,
  formName: string,
  scoring: 'yes_no_na' | 'abc_na' | 'pass_fail'
): { system: string; user: string } {
  const scoringHelp =
    scoring === 'yes_no_na'
      ? `Each question is answered Yes / No / N/A. Set "default_answer" to "yes" for items where compliant charts almost always answer Yes (most items); set "no" only when expected default differs. Never set N/A as a default.`
      : scoring === 'abc_na'
        ? `Each question is answered A (best) / B (acceptable) / C (deficient) / N/A. Set "default_answer" to "A" for items where compliant charts typically score top tier.`
        : `Pass/Fail scoring. Do NOT set "default_answer". Instead mark 1–3 high-stakes patient-safety items as "is_critical": true. The form fails if any critical item is answered No.`;

  const system = `You are an expert in primary-care peer chart review for FQHCs. You design HRSA-compliant peer-review forms used by clinical reviewers to score visit notes. Output only valid JSON — no prose, no markdown fences.`;

  const user = `Draft a peer-review form for the specialty "${specialty}".

Form name: "${formName}"
Scoring system: ${scoring}
${scoringHelp}

Return a JSON object exactly matching this shape:
{
  "form_fields": [
    {
      "field_key": "snake_case_id",
      "field_label": "Human-readable question",
      "field_type": "yes_no",
      "is_required": true,
      "display_order": 0,
      "default_answer": "yes" | "no" | "A" | "B" | "C" | null,
      "is_critical": false
    }
  ]
}

Requirements:
- 10 to 20 questions covering documentation completeness, history & physical, assessment/plan, medication review, preventive care, care coordination, and any specialty-specific elements.
- All questions use field_type "yes_no" (the scoring system controls how the answer renders, not the field_type).
- The last question should always be a free-text "narrative" wrap-up with field_type "text" and default_answer null.
- field_key must be snake_case, unique, ≤ 60 chars.
- display_order is a 0-based sequence.
- is_critical only applies when scoring_system is pass_fail. Otherwise omit or set false.

Output ONLY the JSON object. No commentary.`;

  return { system, user };
}

export async function POST(req: NextRequest) {
  const adminId = await getAdminUserId(req);
  if (!adminId) {
    return NextResponse.json(
      { error: 'Admin auth required', code: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  let body: { specialty?: string; form_name?: string; scoring_system?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body', code: 'VALIDATION_ERROR' },
      { status: 400 }
    );
  }

  const specialty = body.specialty?.trim();
  const formName = body.form_name?.trim();
  const scoring = (body.scoring_system ?? 'yes_no_na') as
    | 'yes_no_na'
    | 'abc_na'
    | 'pass_fail';

  if (!specialty || !formName) {
    return NextResponse.json(
      { error: 'specialty and form_name are required', code: 'VALIDATION_ERROR' },
      { status: 400 }
    );
  }
  if (!['yes_no_na', 'abc_na', 'pass_fail'].includes(scoring)) {
    return NextResponse.json(
      { error: 'invalid scoring_system', code: 'VALIDATION_ERROR' },
      { status: 400 }
    );
  }

  const { system, user } = buildPrompt(specialty, formName, scoring);

  let raw: string;
  try {
    raw = await callClaude(system, user, 4096);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'AI call failed';
    console.error('[forms/ai-draft] callClaude failed:', msg);
    return NextResponse.json(
      { error: msg, code: 'AI_UNAVAILABLE' },
      { status: 503 }
    );
  }

  // Strip code fences if Claude added them despite instructions.
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  let parsed: { form_fields?: DraftField[] };
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    console.error('[forms/ai-draft] JSON parse failed; raw:', raw.slice(0, 500));
    return NextResponse.json(
      { error: 'AI returned non-JSON output', code: 'AI_PARSE_ERROR' },
      { status: 502 }
    );
  }

  const fieldsIn = Array.isArray(parsed.form_fields) ? parsed.form_fields : [];
  if (fieldsIn.length === 0) {
    return NextResponse.json(
      { error: 'AI returned no fields', code: 'AI_EMPTY' },
      { status: 502 }
    );
  }

  // Normalize: enforce field_key uniqueness, display_order, default_answer
  // bounds per scoring system, is_critical only for pass_fail.
  const seenKeys = new Set<string>();
  const form_fields = fieldsIn.map((f, i): DraftField => {
    let key = (f.field_key || safeKey(f.field_label || '', i)).trim();
    if (!key) key = `q_${i + 1}`;
    if (seenKeys.has(key)) key = `${key}_${i + 1}`;
    seenKeys.add(key);

    const fieldType: DraftField['field_type'] =
      f.field_type === 'rating' || f.field_type === 'text' ? f.field_type : 'yes_no';

    let defaultAnswer: DraftField['default_answer'] = null;
    if (scoring === 'yes_no_na' && (f.default_answer === 'yes' || f.default_answer === 'no')) {
      defaultAnswer = f.default_answer;
    } else if (
      scoring === 'abc_na' &&
      (f.default_answer === 'A' || f.default_answer === 'B' || f.default_answer === 'C')
    ) {
      defaultAnswer = f.default_answer;
    }

    const isCritical = scoring === 'pass_fail' ? !!f.is_critical : false;

    return {
      field_key: key,
      field_label: (f.field_label || '').toString().slice(0, 200) || `Question ${i + 1}`,
      field_type: fieldType,
      is_required: f.is_required !== false,
      display_order: i,
      default_answer: defaultAnswer,
      is_critical: isCritical,
    };
  });

  return NextResponse.json({ data: { form_fields } });
}
