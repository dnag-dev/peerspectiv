/**
 * SA-013C — Specialty Highlights (Type 3).
 * Overall % + per-specialty breakdown for one company + one cadence period.
 */

import { renderPdfToBuffer } from '@/lib/pdf/render';
import { SpecialtyHighlightsPdf } from '@/lib/pdf/templates/SpecialtyHighlightsPdf';
import { fetchSpecialtyHighlightsData } from '@/lib/reports/data';

export interface GenerateInput {
  companyId: string;
  rangeStart: string;
  rangeEnd: string;
  cadencePeriodLabel?: string;
}

export async function generate(input: GenerateInput): Promise<Buffer> {
  const data = await fetchSpecialtyHighlightsData({
    companyId: input.companyId,
    rangeStart: input.rangeStart,
    rangeEnd: input.rangeEnd,
  });
  return renderPdfToBuffer(SpecialtyHighlightsPdf({ data }) as any);
}
