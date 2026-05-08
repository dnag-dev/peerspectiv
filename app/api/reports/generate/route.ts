import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
import { companies, reviewResults, reviewCases, providers, reportRuns, savedReports } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { put } from '@vercel/blob';
import { renderPdfToBuffer, pdfResponseHeaders } from '@/lib/pdf/render';
import { ProviderHighlightsPdf } from '@/lib/pdf/templates/ProviderHighlightsPdf';
import { SpecialtyHighlightsPdf } from '@/lib/pdf/templates/SpecialtyHighlightsPdf';
import { QuestionAnalyticsPdf } from '@/lib/pdf/templates/QuestionAnalyticsPdf';
import { InvoicePdf } from '@/lib/pdf/templates/InvoicePdf';
import { QualityCertificatePdf } from '@/lib/pdf/templates/QualityCertificatePdf';
import { PeerEarningsSummaryPdf } from '@/lib/pdf/templates/PeerEarningsSummaryPdf';
import {
  fetchProviderHighlightsData,
  fetchSpecialtyHighlightsData,
  fetchQuestionAnalyticsData,
  fetchInvoicePdfDataFromInvoice,
  fetchQualityCertificateData,
  fetchPeerEarningsSummaryData,
} from '@/lib/reports/data';

async function getAdminUserId(req: NextRequest): Promise<string | null> {
  try {
    const { auth } = await import('@clerk/nextjs/server');
    const result = auth();
    const userId = (result as any)?.userId;
    if (userId) return userId as string;
  } catch {
    // Clerk not configured — fall through
  }
  const demo = req.headers.get('x-demo-user-id');
  if (demo && demo.trim()) return demo.trim();
  const cookieRaw = req.cookies.get('demo_user')?.value;
  if (cookieRaw) {
    try {
      const parsed = JSON.parse(cookieRaw);
      if (parsed?.email) return `demo:${parsed.email}`;
    } catch { /* malformed cookie */ }
  }
  return null;
}
import { anthropic, AI_MODEL } from '@/lib/ai/anthropic';
import {
  getComplianceScore,
  getReviewsThisPeriod,
  getAvgTurnaroundDays,
  getDocumentationRiskRate,
  getRepeatDeficiencyCount,
  getSpecialtyCompliance,
  getRiskDistribution,
} from '@/lib/portal/queries';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // ─── New flow: templateKey-driven PDF generation ────────────────────────
    const templateKey = (body as any)?.templateKey as string | undefined;
    if (templateKey) {
      const userId = (await getAdminUserId(request)) ?? 'client-portal';
      const {
        companyId,
        rangeStart,
        rangeEnd,
        filters,
        savedReportId,
        invoiceId,
        peerId,
        period,
        signedByName,
        signedByTitle,
      } = body as Record<string, any>;

      // Insert run row first so failures are tracked
      const [run] = await db
        .insert(reportRuns)
        .values({
          savedReportId: savedReportId ?? null,
          templateKey,
          companyId: companyId ?? null,
          rangeStart: rangeStart ?? null,
          rangeEnd: rangeEnd ?? null,
          filters: filters ?? null,
          status: 'generating',
          generatedBy: userId,
        })
        .returning({ id: reportRuns.id });

      try {
        let pdfBuffer: Buffer;
        let filename = `${templateKey}-${Date.now()}.pdf`;

        switch (templateKey) {
          case 'provider_highlights': {
            if (!companyId || !rangeStart || !rangeEnd) {
              throw new Error('companyId, rangeStart, rangeEnd required');
            }
            const data = await fetchProviderHighlightsData({
              companyId,
              rangeStart,
              rangeEnd,
              filters,
            });
            pdfBuffer = await renderPdfToBuffer(ProviderHighlightsPdf({ data }) as any);
            filename = `provider-highlights-${rangeStart}-${rangeEnd}.pdf`;
            break;
          }
          case 'specialty_highlights': {
            if (!companyId || !rangeStart || !rangeEnd) {
              throw new Error('companyId, rangeStart, rangeEnd required');
            }
            const data = await fetchSpecialtyHighlightsData({
              companyId,
              rangeStart,
              rangeEnd,
            });
            pdfBuffer = await renderPdfToBuffer(SpecialtyHighlightsPdf({ data }) as any);
            filename = `specialty-highlights-${rangeStart}-${rangeEnd}.pdf`;
            break;
          }
          case 'question_analytics': {
            if (!companyId || !rangeStart || !rangeEnd) {
              throw new Error('companyId, rangeStart, rangeEnd required');
            }
            const data = await fetchQuestionAnalyticsData({
              companyId,
              rangeStart,
              rangeEnd,
              specialty: filters?.specialty,
            });
            pdfBuffer = await renderPdfToBuffer(QuestionAnalyticsPdf({ data }) as any);
            filename = `question-analytics-${rangeStart}-${rangeEnd}.pdf`;
            break;
          }
          case 'invoice': {
            if (!invoiceId) throw new Error('invoiceId required');
            const data = await fetchInvoicePdfDataFromInvoice(invoiceId);
            if (!data) throw new Error('Invoice not found');
            pdfBuffer = await renderPdfToBuffer(InvoicePdf({ data }) as any);
            filename = `invoice-${data.invoiceNumber}.pdf`;
            break;
          }
          case 'quality_certificate': {
            if (!companyId || !period) {
              throw new Error('companyId and period required');
            }
            const data = await fetchQualityCertificateData({
              companyId,
              period,
              signedByName,
              signedByTitle,
            });
            pdfBuffer = await renderPdfToBuffer(QualityCertificatePdf({ data }) as any);
            filename = `quality-certificate-${companyId}-${period}.pdf`;
            break;
          }
          case 'peer_earnings_summary': {
            if (!peerId || !rangeStart || !rangeEnd) {
              throw new Error('peerId, rangeStart, rangeEnd required');
            }
            const data = await fetchPeerEarningsSummaryData({
              peerId,
              rangeStart,
              rangeEnd,
            });
            pdfBuffer = await renderPdfToBuffer(PeerEarningsSummaryPdf({ data }) as any);
            filename = `peer-earnings-${peerId}-${rangeStart}-${rangeEnd}.pdf`;
            break;
          }
          default:
            throw new Error(`Unknown templateKey: ${templateKey}`);
        }

        // If saved-report linked OR caller asked for a stored URL, push to blob
        let pdfUrl: string | null = null;
        if (savedReportId && process.env.BLOB_READ_WRITE_TOKEN) {
          const blob = await put(`reports/${run.id}-${filename}`, pdfBuffer, {
            access: 'public',
            contentType: 'application/pdf',
          });
          pdfUrl = blob.url;

          await db
            .update(savedReports)
            .set({ lastRunAt: new Date() })
            .where(eq(savedReports.id, savedReportId));
        }

        await db
          .update(reportRuns)
          .set({
            status: 'ready',
            pdfUrl,
            completedAt: new Date(),
          })
          .where(eq(reportRuns.id, run.id));

        if (savedReportId) {
          return NextResponse.json({
            runId: run.id,
            pdfUrl,
            status: 'ready',
          });
        }

        // Return PDF inline
        return new NextResponse(pdfBuffer as any, {
          status: 200,
          headers: pdfResponseHeaders(filename),
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('[reports.generate] failed:', message);
        await db
          .update(reportRuns)
          .set({
            status: 'failed',
            failReason: message,
            completedAt: new Date(),
          })
          .where(eq(reportRuns.id, run.id));
        return NextResponse.json(
          { error: 'Report generation failed', detail: message, runId: run.id },
          { status: 500 }
        );
      }
    }

    const { company_id, type, start_date, end_date } = body as {
      company_id: string;
      type?: string;
      start_date?: string;
      end_date?: string;
    };

    if (!company_id) {
      return NextResponse.json(
        { error: 'company_id is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const companyRows = await db
      .select()
      .from(companies)
      .where(eq(companies.id, company_id))
      .limit(1);
    if (companyRows.length === 0) {
      return NextResponse.json(
        { error: 'Company not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }
    const company = companyRows[0];

    // New flow: AI insights for client portal
    if (type === 'insights') {
      const [compliance, reviewsPeriod, avgTurnaround, riskRate, repeats, specialty, risk] =
        await Promise.all([
          getComplianceScore(company_id),
          getReviewsThisPeriod(company_id),
          getAvgTurnaroundDays(company_id),
          getDocumentationRiskRate(company_id),
          getRepeatDeficiencyCount(company_id),
          getSpecialtyCompliance(company_id),
          getRiskDistribution(company_id),
        ]);

      // Top missed criteria
      const allResults = await db
        .select({ deficiencies: reviewResults.deficiencies })
        .from(reviewResults)
        .innerJoin(reviewCases, eq(reviewCases.id, reviewResults.caseId))
        .where(eq(reviewCases.companyId, company_id));
      const defCount = new Map<string, number>();
      for (const r of allResults) {
        const d = r.deficiencies as any;
        if (Array.isArray(d)) {
          for (const item of d) {
            const key =
              typeof item === 'string'
                ? item
                : item?.criterion ?? item?.description ?? JSON.stringify(item);
            defCount.set(key, (defCount.get(key) ?? 0) + 1);
          }
        }
      }
      const topMissed = Array.from(defCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([criterion, count]) => ({ criterion, count }));

      const system = `You are a peer-review quality consultant writing insights for a healthcare organization's quality leadership team. You analyze compliance metrics and produce succinct, actionable insights.

You must respond with ONLY a valid JSON array of insight objects. No markdown fences, no preamble, no trailing text. Each insight has this exact shape:
{
  "type": "positive" | "urgent" | "warning" | "info",
  "title": string (max 70 chars),
  "description": string (1-2 sentences, max 220 chars),
  "recommendation": string (1 sentence, max 180 chars)
}

Produce exactly 4 to 6 insights. Prioritize: one positive (if warranted), urgent items for scores below 70 or high risk rates, warnings for borderline trends, info for useful context.`;

      const user = `Organization: ${company.name}
Quarter: Q1 2026

Metrics:
- Overall compliance score: ${compliance}%
- Reviews this period: ${reviewsPeriod.count}
- Average turnaround: ${avgTurnaround} days
- Documentation risk rate (cases with flags): ${riskRate}%
- Providers with repeat deficiencies (<75% more than once): ${repeats}
- Risk distribution: ${risk.high} high, ${risk.medium} medium, ${risk.low} low

Specialty compliance:
${specialty.map((s) => `- ${s.specialty}: ${s.avg}% (${s.count} reviews)`).join('\n') || '- (no data)'}

Top missed criteria:
${topMissed.map((t, i) => `${i + 1}. ${t.criterion} (${t.count} occurrences)`).join('\n') || '- (no data)'}

Produce the JSON array now.`;

      const resp = await anthropic.messages.create({
        model: AI_MODEL,
        max_tokens: 2048,
        system,
        messages: [{ role: 'user', content: user }],
      });

      const textBlock = resp.content.find((b) => b.type === 'text') as any;
      const raw = textBlock?.text ?? '[]';

      let insights: any[] = [];
      try {
        // Be forgiving: strip any markdown fences or preamble
        const match = raw.match(/\[[\s\S]*\]/);
        const jsonText = match ? match[0] : raw;
        insights = JSON.parse(jsonText);
      } catch (e) {
        console.error('[insights] JSON parse failed, raw:', raw);
        insights = [];
      }

      return NextResponse.json({ insights });
    }

    // Legacy flow preserved — QAPI report generation
    if (type === 'qapi' || (start_date && end_date)) {
      try {
        const { generateQAPIReport } = await import('@/lib/ai/report-generator');
        const narrative = await generateQAPIReport(
          company_id,
          start_date!,
          end_date!
        );
        // Client expects { report: { narrative } } — returning a bare string
        // silently rendered a blank card for every company.
        return NextResponse.json({ report: { narrative } });
      } catch (err) {
        console.error('[generate] QAPI generation failed:', err);
        const message = err instanceof Error ? err.message : String(err);
        return NextResponse.json(
          { error: `QAPI report generation failed: ${message}` },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Unknown report type' },
      { status: 400 }
    );
  } catch (err) {
    console.error('[API] POST /api/reports/generate error:', err);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
