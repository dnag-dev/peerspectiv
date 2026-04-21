import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { correctiveActions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const progress = Math.max(0, Math.min(100, parseInt(body.progress_pct, 10) || 0));

    // Derive status from progress
    const status = progress >= 100 ? "completed" : progress > 0 ? "in_progress" : "open";

    await db
      .update(correctiveActions)
      .set({
        progressPct: progress,
        status,
        updatedAt: new Date(),
      })
      .where(eq(correctiveActions.id, params.id));

    return NextResponse.json({ ok: true, progress_pct: progress, status });
  } catch (err) {
    console.error("[API] PATCH /api/corrective/[id] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
