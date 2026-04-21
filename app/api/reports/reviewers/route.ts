import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET() {
  try {
    // Fetch reviewers
    const { data: reviewers, error: reviewerError } = await supabaseAdmin
      .from("reviewers")
      .select("id, full_name, specialty, total_reviews_completed, ai_agreement_score, status")
      .order("full_name");

    if (reviewerError) {
      console.error("[API] reports/reviewers error:", reviewerError);
      return NextResponse.json(
        { error: "Failed to fetch reviewers", code: "DB_ERROR" },
        { status: 500 }
      );
    }

    // Compute average quality_score per reviewer from review_results
    const { data: qualityData, error: qualityError } = await supabaseAdmin
      .from("review_results")
      .select("reviewer_id, quality_score");

    if (qualityError) {
      console.error("[API] reports/reviewers quality error:", qualityError);
    }

    // Build a map: reviewer_id -> avg quality_score
    const qualityMap = new Map<string, { sum: number; count: number }>();
    if (qualityData) {
      for (const row of qualityData) {
        if (row.reviewer_id && row.quality_score != null) {
          const entry = qualityMap.get(row.reviewer_id) ?? { sum: 0, count: 0 };
          entry.sum += row.quality_score;
          entry.count += 1;
          qualityMap.set(row.reviewer_id, entry);
        }
      }
    }

    const rows = (reviewers ?? []).map((r: any) => {
      const quality = qualityMap.get(r.id);
      return {
        id: r.id as string,
        full_name: r.full_name as string,
        specialty: r.specialty as string,
        total_reviews_completed: (r.total_reviews_completed ?? 0) as number,
        ai_agreement_score: (r.ai_agreement_score ?? null) as number | null,
        quality_score: quality ? Math.round((quality.sum / quality.count) * 10) / 10 : null,
        status: r.status as "active" | "inactive",
      };
    });

    return NextResponse.json({ data: rows });
  } catch (err) {
    console.error("[API] GET /api/reports/reviewers error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
