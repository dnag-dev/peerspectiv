/**
 * SA-013E — Quality Certificate (Type 5).
 * One-page HRSA-recognized PDF: company name, period, signature block.
 */

import { renderPdfToBuffer } from '@/lib/pdf/render';
import { QualityCertificatePdf } from '@/lib/pdf/templates/QualityCertificatePdf';
import { fetchQualityCertificateData } from '@/lib/reports/data';

export interface GenerateInput {
  companyId: string;
  cadencePeriodLabel: string;
  rangeStart?: string;
  rangeEnd?: string;
  signedByName?: string;
  signedByTitle?: string;
  scoreThreshold?: number;
}

export async function generate(input: GenerateInput): Promise<Buffer> {
  const data = await fetchQualityCertificateData({
    companyId: input.companyId,
    period: input.cadencePeriodLabel,
    periodStart: input.rangeStart,
    periodEnd: input.rangeEnd,
    scoreThreshold: input.scoreThreshold,
    signedByName: input.signedByName,
    signedByTitle: input.signedByTitle,
  });
  return renderPdfToBuffer(QualityCertificatePdf({ data }) as any);
}
