import { callClaude } from './anthropic';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function generateQAPIReport(
  companyId: string,
  startDate: string,
  endDate: string
): Promise<string> {
  // Fetch company
  const { data: company } = await supabaseAdmin
    .from('companies')
    .select('name')
    .eq('id', companyId)
    .single();

  // Fetch completed reviews in date range
  const { data: results } = await supabaseAdmin
    .from('review_results')
    .select(`
      overall_score, quality_score, ai_agreement_percentage, deficiencies,
      criteria_scores, submitted_at,
      case:review_cases!inner(company_id, specialty_required, provider:providers(first_name, last_name))
    `)
    .gte('submitted_at', startDate)
    .lte('submitted_at', endDate);

  // Filter by company
  const companyResults = results?.filter(
    (r: any) => r.case?.company_id === companyId
  ) || [];

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
