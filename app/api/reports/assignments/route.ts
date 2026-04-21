import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("company_id");
    const provider = searchParams.get("provider");
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");

    let query = supabaseAdmin
      .from("review_cases")
      .select(
        `
        id,
        encounter_date,
        status,
        updated_at,
        providers:provider_id (first_name, last_name),
        reviewers:reviewer_id (full_name),
        review_results (overall_score, deficiencies)
      `
      )
      .not("reviewer_id", "is", null)
      .order("updated_at", { ascending: false })
      .limit(200);

    if (companyId && companyId !== "all") {
      query = query.eq("company_id", companyId);
    }
    if (startDate) {
      query = query.gte("encounter_date", startDate);
    }
    if (endDate) {
      query = query.lte("encounter_date", endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[API] reports/assignments error:", error);
      return NextResponse.json(
        { error: "Failed to fetch assignment results", code: "DB_ERROR" },
        { status: 500 }
      );
    }

    // Transform into flat rows
    type RawRow = {
      id: string;
      encounter_date: string | null;
      status: string;
      updated_at: string;
      provider: { first_name: string; last_name: string } | null;
      providers: { first_name: string; last_name: string } | null;
      reviewer: { full_name: string } | null;
      reviewers: { full_name: string } | null;
      review_results: Array<{
        overall_score: number | null;
        deficiencies: unknown[] | null;
      }> | null;
    };

    let rows = ((data ?? []) as unknown as RawRow[]).map((c) => {
      const result = c.review_results?.[0];
      const deficiencies = result?.deficiencies;
      return {
        id: c.id,
        provider_name: (c.provider ?? c.providers)
          ? `${(c.provider ?? c.providers)!.first_name} ${(c.provider ?? c.providers)!.last_name}`
          : "Unassigned",
        reviewer_name: (c.reviewer ?? c.reviewers)?.full_name ?? "Unassigned",
        encounter_date: c.encounter_date,
        overall_score: result?.overall_score ?? null,
        deficiencies_count: Array.isArray(deficiencies) ? deficiencies.length : 0,
        completed_date: c.status === "completed" ? c.updated_at : null,
        status: c.status,
      };
    });

    // Client-side provider name filter (Supabase doesn't support ilike on joined fields easily)
    if (provider) {
      const search = provider.toLowerCase();
      rows = rows.filter((r) =>
        r.provider_name.toLowerCase().includes(search)
      );
    }

    return NextResponse.json({ data: rows });
  } catch (err) {
    console.error("[API] GET /api/reports/assignments error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
