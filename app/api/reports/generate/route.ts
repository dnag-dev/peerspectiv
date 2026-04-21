import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const maxDuration = 45;
import { companies, reviewResults, reviewCases, providers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { anthropic, AI_MODEL } from '@/lib/ai/anthropic';
import {
  getComplianceScore,
  getReviewsThisQuarter,
  getAvgTurnaroundDays,
  getDocumentationRiskRate,
  getRepeatDeficiencyCount,
  getSpecialtyCompliance,
  getRiskDistribution,
} from '@/lib/portal/queries';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
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
      const [compliance, reviews, avgTurnaround, riskRate, repeats, specialty, risk] =
        await Promise.all([
          getComplianceScore(company_id),
          getReviewsThisQuarter(company_id),
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
- Reviews completed this quarter: ${reviews}
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
        const report = await generateQAPIReport(
          company_id,
          start_date!,
          end_date!
        );
        return NextResponse.json({ report });
      } catch (err) {
        console.error('[generate] QAPI generation failed:', err);
        return NextResponse.json(
          { error: 'QAPI report generation failed' },
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
