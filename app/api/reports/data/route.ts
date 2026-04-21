import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  reviewCases,
  reviewResults,
  providers,
  correctiveActions,
} from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import {
  getComplianceScore,
  getReviewsThisQuarter,
  getAvgTurnaroundDays,
  getDocumentationRiskRate,
  getRepeatDeficiencyCount,
  getSpecialtyCompliance,
  getProviderPerformance,
} from "@/lib/portal/queries";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const companyId = url.searchParams.get("company_id");
    const kind = url.searchParams.get("kind");
    if (!companyId || !kind) {
      return NextResponse.json(
        { error: "company_id and kind required" },
        { status: 400 }
      );
    }

    if (kind === "exec_summary") {
      const [compliance, reviews, avgTurnaround, riskRate, repeats] =
        await Promise.all([
          getComplianceScore(companyId),
          getReviewsThisQuarter(companyId),
          getAvgTurnaroundDays(companyId),
          getDocumentationRiskRate(companyId),
          getRepeatDeficiencyCount(companyId),
        ]);
      return NextResponse.json({
        compliance,
        reviews,
        avgTurnaround,
        riskRate,
        repeats,
      });
    }

    if (kind === "full_data_csv") {
      const rows = await db
        .select({
          case_id: reviewCases.id,
          status: reviewCases.status,
          specialty: reviewCases.specialtyRequired,
          chart_file: reviewCases.chartFileName,
          assigned_at: reviewCases.assignedAt,
          due_date: reviewCases.dueDate,
          provider_first: providers.firstName,
          provider_last: providers.lastName,
          provider_specialty: providers.specialty,
          score: reviewResults.overallScore,
          submitted_at: reviewResults.submittedAt,
        })
        .from(reviewCases)
        .leftJoin(providers, eq(providers.id, reviewCases.providerId))
        .leftJoin(reviewResults, eq(reviewResults.caseId, reviewCases.id))
        .where(eq(reviewCases.companyId, companyId))
        .orderBy(desc(reviewCases.createdAt));
      return NextResponse.json({ rows });
    }

    if (kind === "provider_perf") {
      const providersList = await getProviderPerformance(companyId);
      return NextResponse.json({ providers: providersList });
    }

    if (kind === "corrective_status") {
      const rows = await db
        .select()
        .from(correctiveActions)
        .where(eq(correctiveActions.companyId, companyId))
        .orderBy(desc(correctiveActions.createdAt));
      return NextResponse.json({
        actions: rows.map((a) => ({
          title: a.title,
          status: a.status,
          progress: a.progressPct ?? 0,
          dueDate: a.dueDate,
        })),
      });
    }

    if (kind === "hrsa_summary") {
      const [compliance, reviews, specialty] = await Promise.all([
        getComplianceScore(companyId),
        getReviewsThisQuarter(companyId),
        getSpecialtyCompliance(companyId),
      ]);

      const results = await db
        .select({ deficiencies: reviewResults.deficiencies })
        .from(reviewResults)
        .innerJoin(reviewCases, eq(reviewCases.id, reviewResults.caseId))
        .where(eq(reviewCases.companyId, companyId));

      const defCount = new Map<string, number>();
      for (const r of results) {
        const d = r.deficiencies as any;
        if (Array.isArray(d)) {
          for (const item of d) {
            const key =
              typeof item === "string"
                ? item
                : item?.criterion ?? item?.description ?? JSON.stringify(item);
            defCount.set(key, (defCount.get(key) ?? 0) + 1);
          }
        } else if (d && typeof d === "object") {
          for (const [k, v] of Object.entries(d)) {
            if (v === false || (v as any)?.met === false) {
              defCount.set(k, (defCount.get(k) ?? 0) + 1);
            }
          }
        }
      }
      const topMissed = Array.from(defCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([criterion, count]) => ({ criterion, count }));

      return NextResponse.json({
        compliance,
        reviews,
        specialty,
        topMissed,
      });
    }

    return NextResponse.json({ error: "unknown kind" }, { status: 400 });
  } catch (err) {
    console.error("[API] GET /api/reports/data error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
