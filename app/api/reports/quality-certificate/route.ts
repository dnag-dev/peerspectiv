import { NextRequest, NextResponse } from "next/server";
import { renderPdfToBuffer, pdfResponseHeaders } from "@/lib/pdf/render";
import { QualityCertificatePdf } from "@/lib/pdf/templates/QualityCertificatePdf";
import { fetchQualityCertificateData } from "@/lib/reports/data";

export const runtime = "nodejs";
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

export async function POST(request: NextRequest) {
  const userId = await getAdminUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const {
      company_id,
      period_start,
      period_end,
      score_threshold,
      signed_by_name,
      signed_by_title,
    } = body as {
      company_id?: string;
      period_start?: string;
      period_end?: string;
      score_threshold?: number;
      signed_by_name?: string;
      signed_by_title?: string;
    };

    if (!company_id || !period_start || !period_end) {
      return NextResponse.json(
        { error: "company_id, period_start, period_end required" },
        { status: 400 }
      );
    }

    const period = `${period_start} — ${period_end}`;
    const data = await fetchQualityCertificateData({
      companyId: company_id,
      period,
      periodStart: period_start,
      periodEnd: period_end,
      scoreThreshold: score_threshold,
      signedByName: signed_by_name,
      signedByTitle: signed_by_title,
    });

    const pdfBuffer = await renderPdfToBuffer(QualityCertificatePdf({ data }) as any);
    const filename = `quality-certificate-${period_start}-${period_end}.pdf`;
    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: pdfResponseHeaders(filename),
    });
  } catch (err) {
    console.error("[API] POST /api/reports/quality-certificate error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Failed to generate certificate", detail: message },
      { status: 500 }
    );
  }
}
