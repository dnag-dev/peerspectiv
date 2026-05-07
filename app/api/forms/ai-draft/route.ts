import { NextRequest, NextResponse } from 'next/server';
import { callClaude } from '@/lib/ai/anthropic';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * AI form draft.
 *
 * POST /api/forms/ai-draft
 * Body: { specialty: string, form_name: string }
 *
 * Returns: { form_fields: BuiltFormField[] } — 10-20 questions appropriate for
 * the specialty. Each question uses yes_no_na field_type with a sensible
 * default_answer per question.
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
  formName: string
): { system: string; user: string } {
  const system = `You are an expert in primary-care peer chart review for FQHCs. You design HRSA-compliant peer-review forms used by clinical reviewers to score visit notes. Output only valid JSON — no prose, no markdown fences.`;

  const user = `Draft a peer-review form for the specialty "${specialty}".

Form name: "${formName}"

Each question is answered Yes / No / N/A. Set "default_answer" to "yes" for items where compliant charts almost always answer Yes (most items); set "no" only when expected default differs. Never set N/A as a default.

Return a JSON object exactly matching this shape:
{
  "form_fields": [
    {
      "field_key": "snake_case_id",
      "field_label": "Human-readable question",
      "field_type": "yes_no",
      "is_required": true,
      "display_order": 0,
      "default_answer": "yes" | "no" | null
    }
  ]
}

Requirements:
- 10 to 20 questions covering documentation completeness, history & physical, assessment/plan, medication review, preventive care, care coordination, and any specialty-specific elements.
- All questions use field_type "yes_no".
- The last question should always be a free-text "narrative" wrap-up with field_type "text" and default_answer null.
- field_key must be snake_case, unique, ≤ 60 chars.
- display_order is a 0-based sequence.

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

  let body: { specialty?: string; form_name?: string };
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

  if (!specialty || !formName) {
    return NextResponse.json(
      { error: 'specialty and form_name are required', code: 'VALIDATION_ERROR' },
      { status: 400 }
    );
  }

  const { system, user } = buildPrompt(specialty, formName);

  let raw: string;
  try {
    raw = await callClaude(system, user, 4096);
  } catch (err: any) {
    console.error('[ai-draft] Claude call failed:', err);
    return NextResponse.json(
      { error: err?.message || 'AI call failed', code: 'AI_ERROR' },
      { status: 502 }
    );
  }

  let parsed: { form_fields: DraftField[] };
  try {
    let text = raw.trim();
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    const first = text.indexOf('{');
    const last = text.lastIndexOf('}');
    if (first >= 0 && last > first) text = text.slice(first, last + 1);
    parsed = JSON.parse(text);
    if (!Array.isArray(parsed.form_fields)) throw new Error('Missing form_fields array');
  } catch (err: any) {
    console.error('[ai-draft] Failed to parse AI response:', err, raw);
    return NextResponse.json(
      { error: 'Failed to parse AI response', code: 'PARSE_ERROR', detail: err?.message },
      { status: 502 }
    );
  }

  const seen = new Set<string>();
  const fields = parsed.form_fields.map((f, idx) => {
    let key = safeKey(f.field_key || f.field_label || '', idx);
    let unique = key;
    let suffix = 1;
    while (seen.has(unique)) unique = `${key}_${suffix++}`;
    seen.add(unique);
    return {
      field_key: unique,
      field_label: f.field_label || `Question ${idx + 1}`,
      field_type: f.field_type === 'text' ? 'text' : 'yes_no',
      is_required: f.is_required ?? true,
      display_order: idx,
      default_answer: f.default_answer ?? null,
    };
  });

  return NextResponse.json({ data: { form_fields: fields } });
}
