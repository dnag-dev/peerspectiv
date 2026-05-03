import { db, toSnake } from "@/lib/db";
import { reviewCases } from "@/lib/db/schema";
import { asc, inArray } from "drizzle-orm";
import type { ReviewCase } from "@/types";
import { ReviewerPortalClient } from "./client";

export const dynamic = "force-dynamic";

export default async function ReviewerPortalPage() {
  let cases: ReviewCase[] = [];
  try {
    const rows = await db.query.reviewCases.findMany({
      where: inArray(reviewCases.status, ["assigned", "in_progress"]),
      orderBy: asc(reviewCases.dueDate),
      with: {
        provider: true,
        peer: true,
        company: true,
        aiAnalysis: true,
      },
    });
    // Preserve legacy shape: shim returned ai_analysis as an array
    cases = rows.map((r) => {
      const snake = toSnake<any>(r);
      return {
        ...snake,
        ai_analysis: snake.ai_analysis ? [snake.ai_analysis] : [],
      };
    }) as ReviewCase[];
  } catch (err) {
    console.error("[ReviewerPortal] Failed to fetch cases:", err);
  }

  return <ReviewerPortalClient cases={cases} />;
}
