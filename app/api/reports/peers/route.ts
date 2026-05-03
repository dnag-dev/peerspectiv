import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { peers, reviewResults } from "@/lib/db/schema";
import { asc } from "drizzle-orm";

export async function GET() {
  try {
    // Fetch peers
    const peerRows = await db
      .select({
        id: peers.id,
        full_name: peers.fullName,
        specialty: peers.specialty,
        total_reviews_completed: peers.totalReviewsCompleted,
        ai_agreement_score: peers.aiAgreementScore,
        status: peers.status,
      })
      .from(peers)
      .orderBy(asc(peers.fullName));

    // Compute average quality_score per peer from review_results
    const qualityRows = await db
      .select({
        peer_id: reviewResults.peerId,
        quality_score: reviewResults.qualityScore,
      })
      .from(reviewResults);

    // Build a map: reviewer_id -> avg quality_score
    const qualityMap = new Map<string, { sum: number; count: number }>();
    for (const row of qualityRows) {
      if (row.peer_id && row.quality_score != null) {
        const entry = qualityMap.get(row.peer_id) ?? { sum: 0, count: 0 };
        entry.sum += row.quality_score;
        entry.count += 1;
        qualityMap.set(row.peer_id, entry);
      }
    }

    // NOTE: Postgres `numeric` columns come back as STRINGS from node-postgres.
    // `ai_agreement_score` is numeric(4,2) — must coerce to Number or the
    // client's `.toFixed()` call crashes the entire /reports page.
    const rows = peerRows.map((r) => {
      const quality = qualityMap.get(r.id);
      const agreementRaw = r.ai_agreement_score;
      const agreement =
        agreementRaw == null || agreementRaw === ""
          ? null
          : Number(agreementRaw);
      return {
        id: r.id,
        full_name: r.full_name as string,
        specialty: r.specialty as string,
        total_reviews_completed: Number(r.total_reviews_completed ?? 0),
        ai_agreement_score: agreement != null && Number.isFinite(agreement) ? agreement : null,
        quality_score: quality ? Math.round((quality.sum / quality.count) * 10) / 10 : null,
        status: r.status as "active" | "inactive",
      };
    });

    return NextResponse.json({ data: rows });
  } catch (err) {
    console.error("[API] GET /api/reports/peers error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
