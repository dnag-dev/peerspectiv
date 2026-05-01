import { callClaude } from './anthropic';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export async function generateQAPIReport(
  companyId: string,
  startDate: string,
  endDate: string
): Promise<string> {
  // Company name
  const companyRows = await db.execute<{ name: string }>(sql`
    SELECT name FROM companies WHERE id = ${companyId} LIMIT 1
  `);
  const company = ((companyRows as any).rows ?? companyRows)[0] as
    | { name: string }
    | undefined;

  // Pull completed reviews joined to their case — the Supabase-compat shim's
  // nested "review_cases!inner(...)" syntax returned undefined joins, so the
  // filter below thought every company had zero results. Raw SQL is plain.
  type Row = {
    overall_score: number | null;
    quality_score: number | null;
    ai_agreement_percentage: number | null;
    deficiencies: any;
    criteria_scores: any;
    submitted_at: string;
  };
  const resultRows = await db.execute<Row>(sql`
    SELECT rr.overall_score, rr.quality_score, rr.ai_agreement_percentage,
           rr.deficiencies, rr.criteria_scores, rr.submitted_at
    FROM review_results rr
    INNER JOIN review_cases rc ON rc.id = rr.case_id
    WHERE rc.company_id = ${companyId}
      AND rr.submitted_at::date >= ${startDate}::date
      AND rr.submitted_at::date <= ${endDate}::date
  `);
  const companyResults = (((resultRows as any).rows ?? resultRows) as Row[]).map((r) => ({
    ...r,
    overall_score: r.overall_score == null ? 0 : Number(r.overall_score),
  }));

  if (companyResults.length === 0) {
    return 'No completed reviews found for this company in the selected date range.';
  }

  // Calculate stats
  const avgScore = companyResults.reduce((sum: number, r: any) => sum + (r.overall_score || 0), 0) / companyResults.length;
  const allDeficiencies = companyResults.flatMap((r: any) =>
    Array.isArray(r.deficiencies) ? r.deficiencies : []
  );
  const deficiencyRate =
    companyResults.filter((r: any) => Array.isArray(r.deficiencies) && r.deficiencies.length > 0).length /
    companyResults.length * 100;

  // Count deficiency types — defensive: deficiencies may be array, object, or null
  const defTypes: Record<string, number> = {};
  const safeDeficiencies = Array.isArray(allDeficiencies) ? allDeficiencies : [];
  safeDeficiencies.forEach((d: any) => {
    if (d && typeof d === 'object' && d.type) {
      defTypes[d.type] = (defTypes[d.type] || 0) + 1;
    }
  });
  const topDeficiencies = Object.entries(defTypes)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([type, count]) => `${type}: ${count}`)
    .join(', ');

  // Avg category scores — criteria_scores is jsonb, so it may come back as an
  // array (expected), as a {criterion: score} object (older shape), or as null.
  // Normalize to an array of {criterion, score} before iterating.
  const normalizeCriteria = (cs: unknown): Array<{ criterion: string; score: number }> => {
    if (Array.isArray(cs)) {
      return cs
        .filter((x): x is Record<string, any> => x && typeof x === 'object')
        .map((x) => ({
          criterion: String(x.criterion ?? ''),
          score: Number(x.score ?? 0),
        }))
        .filter((x) => x.criterion);
    }
    if (cs && typeof cs === 'object') {
      return Object.entries(cs as Record<string, any>).map(([criterion, score]) => ({
        criterion,
        score: typeof score === 'object' && score !== null ? Number(score.score ?? 0) : Number(score ?? 0),
      }));
    }
    return [];
  };

  const categoryTotals: Record<string, number[]> = {};
  companyResults.forEach((r: any) => {
    normalizeCriteria(r.criteria_scores).forEach((cs) => {
      if (!Number.isFinite(cs.score)) return;
      if (!categoryTotals[cs.criterion]) categoryTotals[cs.criterion] = [];
      categoryTotals[cs.criterion].push(cs.score);
    });
  });
  const categoryScores = Object.entries(categoryTotals)
    .map(([criterion, scores]) => `${criterion}: ${(scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)}/4`)
    .join('\n');

  const systemPrompt = `You are generating a QAPI (Quality Assurance Performance Improvement) report for an FQHC.

Generate a professional QAPI report narrative (600-800 words) that:
1. Summarizes the review period and volume
2. Discusses overall quality trends
3. Highlights areas meeting or exceeding standards
4. Identifies areas requiring improvement with specific recommendations
5. Compares to HRSA national benchmarks where applicable
6. Concludes with a quality improvement action plan

Format: Professional medical report language. No bullet points - full paragraphs.`;

  const userPrompt = `Data for this period:
- Company: ${company?.name || 'Unknown'}
- Period: ${startDate} to ${endDate}
- Total reviews: ${companyResults.length}
- Average overall score: ${avgScore.toFixed(1)}/100
- Deficiency rate: ${deficiencyRate.toFixed(1)}%
- Most common deficiencies: ${topDeficiencies || 'None'}
- Score by category:\n${categoryScores}`;

  return await callClaude(systemPrompt, userPrompt, 4096);
}

/**
 * Auto-draft a Corrective Action Plan (CAP) from a case's chart summary +
 * deficiencies. Returns the structured fields used to populate a
 * `corrective_actions` row. Section J4.
 */
export async function generateCorrectiveActionPlan(
  caseId: string,
  deficiencies: Array<{ type?: string; description?: string; severity?: string }> | unknown
): Promise<{ title: string; description: string; identified_issue: string }> {
  // Pull a small chart context: provider name + AI summary, if available.
  type CaseRow = {
    provider_name: string | null;
    ai_summary: string | null;
    overall_score: number | null;
  };
  const rows = await db.execute<CaseRow>(sql`
    SELECT
      COALESCE(p.first_name || ' ' || p.last_name, '') AS provider_name,
      aa.summary AS ai_summary,
      rr.overall_score
    FROM review_cases rc
    LEFT JOIN providers p ON p.id = rc.provider_id
    LEFT JOIN ai_analyses aa ON aa.case_id = rc.id
    LEFT JOIN review_results rr ON rr.case_id = rc.id
    WHERE rc.id = ${caseId}
    LIMIT 1
  `);
  const ctxRow = (((rows as any).rows ?? rows) as CaseRow[])[0];

  const defList = Array.isArray(deficiencies)
    ? (deficiencies as any[])
        .filter((d) => d && typeof d === 'object')
        .map((d, i) => `${i + 1}. [${d.severity ?? 'unknown'}] ${d.type ?? 'Deficiency'}: ${d.description ?? ''}`)
        .join('\n')
    : 'None provided';

  const systemPrompt = `You are drafting a Corrective Action Plan (CAP) for an FQHC peer-review finding.

Return STRICT JSON with these keys ONLY:
{
  "title": "Short imperative title (under 80 chars)",
  "identified_issue": "1-2 sentence summary of the root issue",
  "description": "Concrete corrective steps and remediation timeline (3-6 sentences)"
}

No markdown, no surrounding prose. Just JSON.`;

  const userPrompt = `Case ID: ${caseId}
Provider: ${ctxRow?.provider_name || 'Unknown'}
Overall score: ${ctxRow?.overall_score ?? 'n/a'}
Chart AI summary: ${ctxRow?.ai_summary || 'No summary available'}

Deficiencies:
${defList}

Draft the CAP now.`;

  let raw: string;
  try {
    raw = await callClaude(systemPrompt, userPrompt, 1024);
  } catch (err) {
    console.error('[generateCorrectiveActionPlan] AI call failed:', err);
    return {
      title: 'Auto-generated corrective action',
      identified_issue: 'Review identified deficiencies requiring remediation.',
      description:
        'Please review the case findings and document corrective steps with assigned owner and target date.',
    };
  }

  // Strip code fences if Claude wrapped JSON in ```json ... ```
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    return {
      title: String(parsed.title || 'Auto-generated corrective action').slice(0, 200),
      identified_issue: String(parsed.identified_issue || ''),
      description: String(parsed.description || ''),
    };
  } catch {
    return {
      title: 'Auto-generated corrective action',
      identified_issue: 'Review identified deficiencies requiring remediation.',
      description: cleaned.slice(0, 1500),
    };
  }
}
