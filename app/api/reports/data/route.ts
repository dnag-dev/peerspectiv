import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  reviewCases,
  reviewResults,
  providers,
  correctiveActions,
} from "@/lib/db/schema";
import { eq, desc, sql } from "drizzle-orm";
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

      // Generate a Claude narrative paragraph + a small HRSA quality measures
      // table, replacing the previous stub.
      const yearStart = `${new Date().getFullYear()}-01-01`;
      const today = new Date().toISOString().slice(0, 10);
      let narrative = "";
      try {
        const { generateQAPIReport } = await import("@/lib/ai/report-generator");
        narrative = await generateQAPIReport(companyId, yearStart, today);
      } catch (err) {
        console.error("[hrsa_summary] narrative generation failed:", err);
      }

      // HRSA quality measures: simple proxy table derived from specialty
      // compliance + the company's overall metrics. Keeps the response
      // shape backward-compatible (compliance/reviews/specialty/topMissed)
      // while adding `narrative` and `hrsaMeasures`.
      const hrsaMeasures = [
        {
          measure: "Overall compliance",
          value: `${compliance}%`,
          target: "≥ 85%",
          met: compliance >= 85,
        },
        {
          measure: "Reviews this period",
          value: String(reviews),
          target: "≥ 1",
          met: reviews >= 1,
        },
        ...(specialty ?? []).slice(0, 5).map((s: any) => ({
          measure: `${s.specialty} compliance`,
          value: `${s.avg}%`,
          target: "≥ 85%",
          met: s.avg >= 85,
        })),
      ];

      return NextResponse.json({
        compliance,
        reviews,
        specialty,
        topMissed,
        narrative,
        hrsaMeasures,
      });
    }

    if (kind === "company_specialties") {
      // Distinct specialties for providers attached to this company.
      const result = await db.execute(sql`
        SELECT DISTINCT NULLIF(specialty, '') AS specialty
        FROM providers
        WHERE company_id = ${companyId} AND specialty IS NOT NULL
        ORDER BY specialty
      `);
      const raws =
        ((result as { rows?: unknown[] }).rows as Array<{ specialty: string | null }>) ??
        (result as any);
      const specialties = (raws ?? [])
        .map((r) => (r.specialty ?? '').trim())
        .filter((s) => !!s);
      return NextResponse.json({ specialties });
    }

    if (kind === "reviews_in_period") {
      // Used by Phase 3.3 admin Reports page (Per-Provider tab) to populate
      // the review picker for the selected company + cadence period.
      const start = url.searchParams.get("start");
      const end = url.searchParams.get("end");
      if (!start || !end) {
        return NextResponse.json({ error: "start and end required" }, { status: 400 });
      }
      const result = await db.execute(sql`
        SELECT
          rr.id AS result_id,
          p.first_name AS provider_first,
          p.last_name  AS provider_last,
          rr.submitted_at
        FROM review_results rr
        INNER JOIN review_cases rc ON rc.id = rr.case_id
        INNER JOIN providers     p  ON p.id  = rc.provider_id
        WHERE rc.company_id = ${companyId}
          AND rr.submitted_at::date >= ${start}::date
          AND rr.submitted_at::date <= ${end}::date
        ORDER BY rr.submitted_at DESC
        LIMIT 500
      `);
      const raws =
        ((result as { rows?: unknown[] }).rows as Array<{
          result_id: string;
          provider_first: string | null;
          provider_last: string | null;
          submitted_at: string;
        }>) ?? (result as any);
      const reviews = (raws ?? []).map((r) => {
        const name =
          [r.provider_first, r.provider_last].filter(Boolean).join(" ").trim() ||
          "Unknown provider";
        const d = new Date(r.submitted_at).toISOString().slice(0, 10);
        return { id: r.result_id, label: `${name} — ${d}` };
      });
      return NextResponse.json({ reviews });
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
