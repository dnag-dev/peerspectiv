import { NextRequest, NextResponse } from "next/server";
import { fetchPeerScorecard } from "@/lib/reports/data";

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
  const cookieRaw = req.cookies.get('demo_user')?.value;
  if (cookieRaw) {
    try {
      const parsed = JSON.parse(cookieRaw);
      if (parsed?.email) return `demo:${parsed.email}`;
    } catch { /* malformed cookie */ }
  }
  return null;
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

    const rows = await fetchPeerScorecard(periodStart, periodEnd);
    return NextResponse.json({ data: rows, period_start: periodStart, period_end: periodEnd });
  } catch (err) {
    console.error("[API] GET /api/reports/peer-scorecard error:", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

