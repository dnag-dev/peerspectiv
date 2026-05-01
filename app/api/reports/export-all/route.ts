import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function isAuthenticated(req: NextRequest): Promise<boolean> {
  try {
    const { auth } = await import("@clerk/nextjs/server");
    const result = auth();
    if ((result as any)?.userId) return true;
  } catch {
    /* clerk not configured */
  }
  // Demo / portal-cookie auth: any of these signals is sufficient.
  if (req.headers.get("x-demo-user-id")?.trim()) return true;
  if (req.cookies.get("demo_user")?.value) return true;
  return false;
}

/**
 * Export-all fallback for a quarter. archiver is not a dependency, so this
 * returns a manifest of per-file URLs. The client opens them sequentially
 * with a small delay so the browser doesn't block the popups.
 *
 * POST { company_id, year, quarter (1-4) }
 *   -> { files: [{ name, url }] }
 */
export async function POST(request: NextRequest) {
  if (!(await isAuthenticated(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const { company_id, year, quarter } = body as {
      company_id?: string;
      year?: number | string;
      quarter?: number | string;
    };
    if (!company_id || !year || !quarter) {
      return NextResponse.json(
        { error: "company_id, year, quarter required" },
        { status: 400 }
      );
    }
    const q = Number(quarter);
    const y = Number(year);
    if (!(q >= 1 && q <= 4) || !Number.isFinite(y)) {
      return NextResponse.json(
        { error: "quarter must be 1-4, year must be a number" },
        { status: 400 }
      );
    }

    const startMonth = (q - 1) * 3;
    const start = `${y}-${String(startMonth + 1).padStart(2, "0")}-01`;
    const lastMonth = startMonth + 3;
    const lastDay = new Date(Date.UTC(y, lastMonth, 0)).getUTCDate();
    const end = `${y}-${String(lastMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    const periodLabel = `Q${q} ${y}`;

    // Build references to existing endpoints. Each entry is opened by the
    // client; the browser triggers the download via Content-Disposition.
    const base = `/api/reports/generate`;
    const cert = `/api/reports/quality-certificate`;

    const files = [
      {
        name: `provider-highlights-${start}-${end}.pdf`,
        url: base,
        method: "POST",
        body: {
          templateKey: "provider_highlights",
          companyId: company_id,
          rangeStart: start,
          rangeEnd: end,
        },
      },
      {
        name: `specialty-highlights-${start}-${end}.pdf`,
        url: base,
        method: "POST",
        body: {
          templateKey: "specialty_highlights",
          companyId: company_id,
          rangeStart: start,
          rangeEnd: end,
        },
      },
      {
        name: `question-analytics-${start}-${end}.pdf`,
        url: base,
        method: "POST",
        body: {
          templateKey: "question_analytics",
          companyId: company_id,
          rangeStart: start,
          rangeEnd: end,
        },
      },
      {
        name: `quality-certificate-${start}-${end}.pdf`,
        url: cert,
        method: "POST",
        body: {
          company_id,
          period_start: start,
          period_end: end,
        },
      },
    ];

    return NextResponse.json({
      period: periodLabel,
      period_start: start,
      period_end: end,
      files,
    });
  } catch (err) {
    console.error("[API] POST /api/reports/export-all error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
