/**
 * Phase 3.7 — Download All (SA-094, SA-131, CL-041).
 *
 * POST { company_id, cadence_period_label, range_start, range_end }
 *  → ZIP containing:
 *      {Company}_Per_Provider_Sample_{Period}.pdf  (one provider sample if any)
 *      {Company}_Question_Analytics_{Period}.pdf
 *      {Company}_Specialty_Highlights_{Period}.pdf
 *      {Company}_Provider_Highlights_{Period}.pdf
 *      {Company}_Quality_Certificate_{Period}.pdf
 *      {Company}_Invoice_{Period}.pdf  (real per-specialty pricing from SA-131)
 */

import { NextRequest, NextResponse } from 'next/server';
import archiver from 'archiver';
import { Readable } from 'stream';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { requireActiveCompany } from '@/lib/utils/company-guard';
import { assertReportAccess, type Role } from '@/lib/reports/persona-guard';
import * as perProvider from '@/lib/reports/types/per-provider-review-answers';
import * as questionAnalytics from '@/lib/reports/types/question-analytics';
import * as specialtyHighlights from '@/lib/reports/types/specialty-highlights';
import * as providerHighlights from '@/lib/reports/types/provider-highlights';
import * as qualityCertificate from '@/lib/reports/types/quality-certificate';
import { generateInvoice, type InvoiceCaseBreakdown } from '@/lib/invoices/generate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

interface Body {
  company_id: string;
  cadence_period_label: string;
  range_start: string;
  range_end: string;
}

function sanitize(s: string): string {
  return s.replace(/[^A-Za-z0-9_.-]+/g, '_').replace(/_+/g, '_');
}

async function getCompanyName(companyId: string): Promise<string> {
  const result = await db.execute<{ name: string }>(sql`
    SELECT name FROM companies WHERE id = ${companyId} LIMIT 1
  `);
  const rows =
    ((result as { rows?: Array<{ name: string }> }).rows as Array<{ name: string }> | undefined) ??
    (result as any);
  return rows?.[0]?.name ?? 'Company';
}

/** SA-131: Generate real invoice PDF using per-specialty pricing from the cadence. */
async function buildInvoicePdf(
  companyId: string,
  cadencePeriodLabel: string,
  rangeStart: string,
  rangeEnd: string
): Promise<Buffer> {
  // Query case breakdown by specialty for the period
  const breakdownRows = await db.execute<{ specialty: string; cnt: number }>(sql`
    SELECT COALESCE(rc.specialty_required, 'General') AS specialty,
           COUNT(*)::int AS cnt
    FROM review_results rr
    INNER JOIN review_cases rc ON rc.id = rr.case_id
    WHERE rc.company_id = ${companyId}
      AND rr.submitted_at::date >= ${rangeStart}::date
      AND rr.submitted_at::date <= ${rangeEnd}::date
    GROUP BY COALESCE(rc.specialty_required, 'General')
  `);
  const rows = ((breakdownRows as any).rows ?? breakdownRows) as Array<{ specialty: string; cnt: number }>;
  const bySpecialty: Record<string, number> = {};
  for (const r of rows) {
    bySpecialty[r.specialty] = r.cnt;
  }
  const breakdown: InvoiceCaseBreakdown = { bySpecialty };

  try {
    const result = await generateInvoice({
      companyId,
      cadencePeriodLabel,
      breakdown,
    });
    return result.pdfBuffer;
  } catch (e) {
    // Fallback: if invoice generation fails, produce a minimal placeholder
    console.warn('[download-all] invoice generation failed, using fallback:', e);
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Invoice', 14, 22);
    doc.setFontSize(11);
    doc.text(`Period: ${cadencePeriodLabel}`, 14, 36);
    doc.text('Invoice generation encountered an error. Please regenerate from the Invoices page.', 14, 48, { maxWidth: 180 });
    return Buffer.from(doc.output('arraybuffer'));
  }
}

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const { company_id, cadence_period_label, range_start, range_end } = body;
  if (!company_id || !cadence_period_label || !range_start || !range_end) {
    return NextResponse.json(
      { error: 'company_id, cadence_period_label, range_start, range_end all required' },
      { status: 400 }
    );
  }

  // Company status guard
  const activeCompany = await requireActiveCompany(company_id);
  if (!activeCompany) {
    return NextResponse.json(
      { error: 'Company must be Active to download reports.', code: 'COMPANY_NOT_ACTIVE' },
      { status: 403 }
    );
  }

  const role = (req.headers.get('x-demo-role') as Role | null) ?? 'admin';
  const userCompany = req.headers.get('x-demo-company-id') ?? undefined;
  // Download-all is a per-company bundle. Treat as quality_certificate for
  // gate purposes (admins + clients of own company).
  try {
    assertReportAccess(
      role,
      'quality_certificate',
      { companyId: company_id },
      { companyId: userCompany }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Forbidden' },
      { status: 403 }
    );
  }

  try {
    const companyName = await getCompanyName(company_id);
    const safeCo = sanitize(companyName);
    const safePeriod = sanitize(cadence_period_label);

    const filenameZip = `${safeCo}_${safePeriod}_All_Reports.zip`;

    // Generate all PDFs in parallel.
    const [qa, sh, ph, qc] = await Promise.all([
      questionAnalytics.generate({
        companyId: company_id,
        rangeStart: range_start,
        rangeEnd: range_end,
        cadencePeriodLabel: cadence_period_label,
      }),
      specialtyHighlights.generate({
        companyId: company_id,
        rangeStart: range_start,
        rangeEnd: range_end,
        cadencePeriodLabel: cadence_period_label,
      }),
      providerHighlights.generate({
        companyId: company_id,
        rangeStart: range_start,
        rangeEnd: range_end,
        cadencePeriodLabel: cadence_period_label,
      }),
      qualityCertificate.generate({
        companyId: company_id,
        cadencePeriodLabel: cadence_period_label,
        rangeStart: range_start,
        rangeEnd: range_end,
      }),
    ]);

    // Pick first available review_results in the period for the per-provider sample.
    const sampleResult = await db.execute<{ id: string }>(sql`
      SELECT rr.id FROM review_results rr
      INNER JOIN review_cases rc ON rc.id = rr.case_id
      WHERE rc.company_id = ${company_id}
        AND rr.submitted_at::date >= ${range_start}::date
        AND rr.submitted_at::date <= ${range_end}::date
      ORDER BY rr.submitted_at DESC
      LIMIT 1
    `);
    const sampleRows =
      ((sampleResult as { rows?: Array<{ id: string }> }).rows as Array<{ id: string }> | undefined) ??
      (sampleResult as any);
    const sampleResultId: string | undefined = sampleRows?.[0]?.id;

    let perProviderPdf: Buffer | null = null;
    if (sampleResultId) {
      try {
        perProviderPdf = await perProvider.generate({ resultId: sampleResultId });
      } catch (e) {
        console.warn('[download-all] per_provider sample failed:', e);
      }
    }

    const invoicePdf = await buildInvoicePdf(company_id, cadence_period_label, range_start, range_end);

    // Build the ZIP via streaming archiver.
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.append(qa, { name: `${safeCo}_Question_Analytics_${safePeriod}.pdf` });
    archive.append(sh, { name: `${safeCo}_Specialty_Highlights_${safePeriod}.pdf` });
    archive.append(ph, { name: `${safeCo}_Provider_Highlights_${safePeriod}.pdf` });
    archive.append(qc, { name: `${safeCo}_Quality_Certificate_${safePeriod}.pdf` });
    if (perProviderPdf) {
      archive.append(perProviderPdf, {
        name: `${safeCo}_Per_Provider_Sample_${safePeriod}.pdf`,
      });
    }
    archive.append(invoicePdf, { name: `${safeCo}_Invoice_${safePeriod}.pdf` });
    archive.finalize();

    // Collect to a single buffer (60s budget; archives are small).
    const chunks: Buffer[] = [];
    for await (const chunk of archive as unknown as Readable) {
      chunks.push(chunk as Buffer);
    }
    const zipBuf = Buffer.concat(chunks);

    return new NextResponse(zipBuf as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filenameZip}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[api/reports/download-all] failed:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
