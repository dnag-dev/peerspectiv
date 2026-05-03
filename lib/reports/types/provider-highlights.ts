/**
 * SA-013D — Provider Highlights (Type 4).
 * Lists every provider with Total Measures Met % for a company + cadence period.
 */

import { renderPdfToBuffer } from '@/lib/pdf/render';
import { ProviderHighlightsPdf } from '@/lib/pdf/templates/ProviderHighlightsPdf';
import { fetchProviderHighlightsData } from '@/lib/reports/data';

export interface GenerateInput {
  companyId: string;
  rangeStart: string;
  rangeEnd: string;
  cadencePeriodLabel?: string;
  filters?: { providerIds?: string[]; specialties?: string[]; tagIds?: string[] };
}

export async function generate(input: GenerateInput): Promise<Buffer> {
  const data = await fetchProviderHighlightsData({
    companyId: input.companyId,
    rangeStart: input.rangeStart,
    rangeEnd: input.rangeEnd,
    filters: input.filters,
  });
  return renderPdfToBuffer(ProviderHighlightsPdf({ data }) as any);
}
