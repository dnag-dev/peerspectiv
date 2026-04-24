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
      AND rr.submitted_at >= ${startDate}
      AND rr.submitted_at < (${endDate}::date + INTERVAL '1 day')
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
  const allDeficiencies = companyResults.flatMap((r: any) => r.deficiencies || []);
  const deficiencyRate = companyResults.filter((r: any) => (r.deficiencies?.length || 0) > 0).length / companyResults.length * 100;

  // Count deficiency types
  const defTypes: Record<string, number> = {};
  allDeficiencies.forEach((d: any) => {
    defTypes[d.type] = (defTypes[d.type] || 0) + 1;
  });
  const topDeficiencies = Object.entries(defTypes)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([type, count]) => `${type}: ${count}`)
    .join(', ');

  // Avg category scores
  const categoryTotals: Record<string, number[]> = {};
  companyResults.forEach((r: any) => {
    (r.criteria_scores || []).forEach((cs: any) => {
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
