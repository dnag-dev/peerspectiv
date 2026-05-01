import { NextRequest, NextResponse } from "next/server";
import { fetchReviewerScorecard } from "@/lib/reports/data";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
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
    return NextResponse.json({ data: rows, period_start: periodStart, period_end: periodEnd });
  } catch (err) {
    console.error("[API] GET /api/reports/reviewer-scorecard error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

