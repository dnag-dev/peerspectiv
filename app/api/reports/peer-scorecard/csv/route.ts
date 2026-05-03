import { NextRequest, NextResponse } from "next/server";
import { fetchReviewerScorecard } from "@/lib/reports/data";

export const dynamic = "force-dynamic";

async function getAdminUserId(req: NextRequest): Promise<string | null> {
  try {
    const { auth } = await import("@clerk/nextjs/server");
    const result = auth();
    const userId = (result as any)?.userId;
    if (userId) return userId as string;
  } catch {
    /* clerk not configured */
  }
  const demo = req.headers.get("x-demo-user-id");
  if (demo && demo.trim()) return demo.trim();
  return null;
}

function escapeCsv(v: unknown): string {
  if (v == null) return "";
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(request: NextRequest) {
  const userId = await getAdminUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const periodStart = searchParams.get("period_start");
    const periodEnd = searchParams.get("period_end");

    if (!periodStart || !periodEnd) {
      return NextResponse.json(
        { error: "period_start and period_end are required" },
        { status: 400 }
      );
    }

    const rows = await fetchReviewerScorecard(periodStart, periodEnd);
    const headers = [
      "Reviewer",
      "Cases Reviewed",
      "Avg Turnaround (days)",
      "AI Agreement %",
      "Quality Score",
      "Avg Minutes/Chart",
      "Earnings",
    ];
    const lines = [headers.join(",")];
    for (const r of rows) {
      lines.push(
        [
          r.full_name,
          r.cases_reviewed,
          r.avg_turnaround_days ?? "",
          r.ai_agreement_pct ?? "",
          r.quality_score ?? "",
          r.avg_minutes_per_chart ?? "",
          r.earnings.toFixed(2),
        ]
          .map(escapeCsv)
          .join(",")
      );
    }
    const csv = lines.join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="reviewer-scorecard-${periodStart}-to-${periodEnd}.csv"`,
      },
    });
  } catch (err) {
    console.error("[API] GET /api/reports/peer-scorecard/csv error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
