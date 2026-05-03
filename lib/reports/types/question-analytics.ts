/**
 * SA-013B — Question Analytics (Type 2).
 * One company + one specialty (optional) + one cadence period →
 * per-question Yes/No/NA + Default-hit %, sorted by fail-rate DESC (SA-095).
 *
 * Backed by existing fetcher fetchQuestionAnalyticsData and template
 * QuestionAnalyticsPdf. The fetcher already sorts by NO-rate descending.
 */

import { renderPdfToBuffer } from '@/lib/pdf/render';
import { QuestionAnalyticsPdf } from '@/lib/pdf/templates/QuestionAnalyticsPdf';
import { fetchQuestionAnalyticsData } from '@/lib/reports/data';

export interface GenerateInput {
  companyId: string;
  rangeStart: string;
  rangeEnd: string;
  specialty?: string;
  cadencePeriodLabel?: string;
}

export async function generate(input: GenerateInput): Promise<Buffer> {
  const data = await fetchQuestionAnalyticsData({
    companyId: input.companyId,
    rangeStart: input.rangeStart,
    rangeEnd: input.rangeEnd,
    specialty: input.specialty,
  });
  return renderPdfToBuffer(QuestionAnalyticsPdf({ data }) as any);
}
